"""
User Management - Local user storage and management
Handles user creation, authentication, and role management
"""

import logging
import os
import json
import hashlib
import secrets
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import threading

logger = logging.getLogger(__name__)


class User:
    """Represents a user in the system"""
    
    def __init__(
        self,
        username: str,
        email: str,
        password_hash: str,
        role: str = "user",
        user_id: Optional[str] = None,
        created_at: Optional[str] = None,
        last_login: Optional[str] = None,
        active: bool = True
    ):
        self.user_id = user_id or secrets.token_urlsafe(16)
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role  # "admin", "user", "viewer"
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.last_login = last_login
        self.active = active
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary (without password hash)"""
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at,
            'last_login': self.last_login,
            'active': self.active
        }
    
    def to_dict_with_password(self) -> Dict[str, Any]:
        """Convert user to dictionary (with password hash for storage)"""
        data = self.to_dict()
        data['password_hash'] = self.password_hash
        return data
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'User':
        """Create user from dictionary"""
        return User(
            user_id=data.get('user_id'),
            username=data['username'],
            email=data['email'],
            password_hash=data['password_hash'],
            role=data.get('role', 'user'),
            created_at=data.get('created_at'),
            last_login=data.get('last_login'),
            active=data.get('active', True)
        )


class UserManager:
    """Manages users with local JSON storage"""
    
    def __init__(self, storage_file: Optional[str] = None):
        # Use container-friendly path
        is_container = (
            os.path.exists('/.dockerenv') or 
            os.getenv('CONTAINER_ENV') == 'true' or 
            os.getenv('K_SERVICE') is not None
        )
        
        if storage_file:
            self.storage_file = storage_file
        elif is_container:
            self.storage_file = '/tmp/.firewall-ai/users.json'
        else:
            self.storage_file = os.path.join(
                os.path.expanduser('~'), 
                '.firewall-ai', 
                'users.json'
            )
        
        self._lock = threading.Lock()
        self._users: Dict[str, User] = {}
        self._load_users()
        self._ensure_default_admin()
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256 with salt"""
        # For local development, using SHA-256 is acceptable
        # For production, consider using bcrypt or argon2
        salt = secrets.token_hex(16)
        hash_obj = hashlib.sha256()
        hash_obj.update((password + salt).encode('utf-8'))
        password_hash = hash_obj.hexdigest()
        return f"{salt}:{password_hash}"
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            salt, stored_hash = password_hash.split(':', 1)
            hash_obj = hashlib.sha256()
            hash_obj.update((password + salt).encode('utf-8'))
            computed_hash = hash_obj.hexdigest()
            return computed_hash == stored_hash
        except Exception:
            return False
    
    def _load_users(self) -> None:
        """Load users from storage file"""
        try:
            storage_path = Path(self.storage_file)
            if storage_path.exists():
                with open(storage_path, 'r') as f:
                    data = json.load(f)
                    users_data = data.get('users', [])
                    self._users = {
                        user_data['user_id']: User.from_dict(user_data)
                        for user_data in users_data
                    }
                    logger.info(f"Loaded {len(self._users)} users from storage")
            else:
                # Create directory if it doesn't exist
                storage_path.parent.mkdir(parents=True, exist_ok=True)
                logger.info("No users file found, starting with empty user list")
        except Exception as e:
            logger.error(f"Failed to load users: {e}")
            self._users = {}
    
    def _save_users(self) -> None:
        """Save users to storage file"""
        try:
            storage_path = Path(self.storage_file)
            storage_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write to a temporary file first, then rename (atomic operation)
            temp_path = storage_path.with_suffix('.json.tmp')
            users_data = {
                'users': [user.to_dict_with_password() for user in self._users.values()],
                'updated_at': datetime.utcnow().isoformat()
            }
            with open(temp_path, 'w') as f:
                json.dump(users_data, f, indent=2)
            # Atomic rename
            temp_path.replace(storage_path)
            logger.debug(f"Saved {len(self._users)} users to storage")
        except Exception as e:
            logger.error(f"Failed to save users to {self.storage_file}: {e}", exc_info=True)
            # Clean up temp file if it exists
            temp_path = storage_path.with_suffix('.json.tmp')
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            # Don't re-raise - allow caller to continue even if save fails
            # This prevents authentication from failing due to file I/O issues
    
    def _ensure_default_admin(self) -> None:
        """Ensure default admin user exists"""
        # Check if any admin exists
        has_admin = any(user.role == 'admin' and user.active for user in self._users.values())
        
        if not has_admin:
            # Create default admin from environment variables or defaults
            admin_username = os.getenv('ADMIN_USERNAME', 'admin')
            admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
            
            # Check if admin username already exists
            existing_user = self.get_user_by_username(admin_username)
            if existing_user:
                # Update existing user to admin
                existing_user.role = 'admin'
                existing_user.active = True
                logger.info(f"Updated existing user {admin_username} to admin role")
            else:
                # Create new admin user
                admin_user = User(
                    username=admin_username,
                    email=f"{admin_username}@firewall-ai.local",
                    password_hash=self._hash_password(admin_password),
                    role='admin'
                )
                self._users[admin_user.user_id] = admin_user
                logger.info(f"Created default admin user: {admin_username}")
            
            self._save_users()
    
    def authenticate(self, username: str, password: str) -> Optional[User]:
        """Authenticate a user"""
        try:
            with self._lock:
                user = self.get_user_by_username(username)
                if not user:
                    return None
                
                if not user.active:
                    logger.warning(f"Attempted login for inactive user: {username}")
                    return None
                
                if not self._verify_password(password, user.password_hash):
                    return None
                
                # Update last login
                user.last_login = datetime.utcnow().isoformat()
                # Save users, but don't fail authentication if save fails
                try:
                    self._save_users()
                except Exception as e:
                    logger.warning(f"Failed to save users after authentication: {e}")
                    # Continue anyway - authentication succeeded
                
                return user
        except Exception as e:
            logger.error(f"Authentication error for user {username}: {e}", exc_info=True)
            return None
    
    def create_user(
        self,
        username: str,
        email: str,
        password: str,
        role: str = "user"
    ) -> User:
        """Create a new user"""
        with self._lock:
            # Check if username already exists
            if self.get_user_by_username(username):
                raise ValueError(f"Username '{username}' already exists")
            
            # Check if email already exists
            if self.get_user_by_email(email):
                raise ValueError(f"Email '{email}' already exists")
            
            # Validate role
            if role not in ['admin', 'user', 'viewer']:
                raise ValueError(f"Invalid role: {role}. Must be 'admin', 'user', or 'viewer'")
            
            user = User(
                username=username,
                email=email,
                password_hash=self._hash_password(password),
                role=role
            )
            
            self._users[user.user_id] = user
            self._save_users()
            logger.info(f"Created user: {username} ({role})")
            
            return user
    
    def update_user(
        self,
        user_id: str,
        username: Optional[str] = None,
        email: Optional[str] = None,
        password: Optional[str] = None,
        role: Optional[str] = None,
        active: Optional[bool] = None
    ) -> Optional[User]:
        """Update a user"""
        with self._lock:
            user = self._users.get(user_id)
            if not user:
                return None
            
            if username and username != user.username:
                # Check if new username is taken
                existing = self.get_user_by_username(username)
                if existing and existing.user_id != user_id:
                    raise ValueError(f"Username '{username}' already exists")
                user.username = username
            
            if email and email != user.email:
                # Check if new email is taken
                existing = self.get_user_by_email(email)
                if existing and existing.user_id != user_id:
                    raise ValueError(f"Email '{email}' already exists")
                user.email = email
            
            if password:
                user.password_hash = self._hash_password(password)
            
            if role:
                if role not in ['admin', 'user', 'viewer']:
                    raise ValueError(f"Invalid role: {role}")
                user.role = role
            
            if active is not None:
                user.active = active
            
            self._save_users()
            logger.info(f"Updated user: {user_id}")
            
            return user
    
    def delete_user(self, user_id: str) -> bool:
        """Delete a user"""
        with self._lock:
            if user_id not in self._users:
                return False
            
            user = self._users[user_id]
            
            # Prevent deleting the last admin
            admin_count = sum(1 for u in self._users.values() if u.role == 'admin' and u.active)
            if user.role == 'admin' and admin_count <= 1:
                raise ValueError("Cannot delete the last admin user")
            
            del self._users[user_id]
            self._save_users()
            logger.info(f"Deleted user: {user_id}")
            
            return True
    
    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        with self._lock:
            return self._users.get(user_id)
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        with self._lock:
            for user in self._users.values():
                if user.username == username:
                    return user
            return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        with self._lock:
            for user in self._users.values():
                if user.email == email:
                    return user
            return None
    
    def list_users(self, include_inactive: bool = False) -> List[User]:
        """List all users"""
        with self._lock:
            users = list(self._users.values())
            if not include_inactive:
                users = [u for u in users if u.active]
            return sorted(users, key=lambda u: u.created_at)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get user statistics"""
        with self._lock:
            total = len(self._users)
            active = sum(1 for u in self._users.values() if u.active)
            admins = sum(1 for u in self._users.values() if u.role == 'admin' and u.active)
            users = sum(1 for u in self._users.values() if u.role == 'user' and u.active)
            viewers = sum(1 for u in self._users.values() if u.role == 'viewer' and u.active)
            
            return {
                'total_users': total,
                'active_users': active,
                'inactive_users': total - active,
                'admins': admins,
                'users': users,
                'viewers': viewers
            }


# Global instance
_user_manager: Optional[UserManager] = None

def get_user_manager() -> UserManager:
    """Get the global user manager instance"""
    global _user_manager
    if _user_manager is None:
        _user_manager = UserManager()
    return _user_manager
