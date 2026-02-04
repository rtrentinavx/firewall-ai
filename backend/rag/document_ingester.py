"""
Document Ingester - Handles document ingestion from files and URLs
"""

import logging
import os
import tempfile
from typing import Dict, Any, Optional, Tuple, cast
from pathlib import Path
import requests  # type: ignore[import-untyped]
from urllib.parse import urlparse
import mimetypes

logger = logging.getLogger(__name__)

class DocumentIngester:
    """Handles document ingestion from various sources"""
    
    SUPPORTED_FILE_EXTENSIONS = {
        '.txt', '.md', '.markdown', '.rst',
        '.pdf', '.docx', '.doc',
        '.html', '.htm',
        '.json', '.yaml', '.yml',
        '.csv'
    }
    
    def __init__(self, max_file_size_mb: int = 10):
        self.max_file_size = max_file_size_mb * 1024 * 1024  # Convert to bytes
    
    def ingest_file(
        self,
        file_path: str,
        title: Optional[str] = None
    ) -> Tuple[str, str, Dict[str, Any]]:
        """
        Ingest a document from a local file
        
        Returns:
            Tuple of (title, content, metadata)
        """
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")
        
        # Check file size
        file_size = path.stat().st_size
        if file_size > self.max_file_size:
            raise ValueError(f"File too large: {file_size / 1024 / 1024:.2f}MB (max: {self.max_file_size / 1024 / 1024}MB)")
        
        # Check extension
        ext = path.suffix.lower()
        if ext not in self.SUPPORTED_FILE_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {ext}")
        
        # Extract title if not provided
        if not title:
            title = path.stem
        
        # Read content based on file type
        content = self._read_file(path, ext)
        
        metadata = {
            'file_path': str(path),
            'file_name': path.name,
            'file_size': file_size,
            'file_extension': ext,
            'mime_type': mimetypes.guess_type(str(path))[0] or 'unknown'
        }
        
        logger.info(f"Ingested file: {path.name} ({file_size} bytes)")
        return title, content, metadata
    
    def ingest_url(
        self,
        url: str,
        title: Optional[str] = None
    ) -> Tuple[str, str, Dict[str, Any]]:
        """
        Ingest a document from a URL
        
        Returns:
            Tuple of (title, content, metadata)
        """
        try:
            # Fetch URL
            response = requests.get(url, timeout=30, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; FirewallAI/1.0)'
            })
            response.raise_for_status()
            
            # Check content size
            content_length = len(response.content)
            if content_length > self.max_file_size:
                raise ValueError(f"Content too large: {content_length / 1024 / 1024:.2f}MB")
            
            # Parse URL
            parsed = urlparse(url)
            
            # Extract title if not provided
            if not title:
                title = parsed.path.split('/')[-1] or parsed.netloc
                if not title or title == '/':
                    title = f"Document from {parsed.netloc}"
            
            # Extract content based on content type
            content_type = response.headers.get('Content-Type', '').split(';')[0].strip()
            content = self._extract_content_from_response(response, content_type)
            
            metadata = {
                'url': url,
                'domain': parsed.netloc,
                'path': parsed.path,
                'content_type': content_type,
                'content_length': content_length,
                'status_code': response.status_code
            }
            
            logger.info(f"Ingested URL: {url} ({content_length} bytes)")
            return title, content, metadata
            
        except requests.RequestException as e:
            raise ValueError(f"Failed to fetch URL: {e}")
    
    def _read_file(self, path: Path, ext: str) -> str:
        """Read file content based on extension"""
        
        if ext in {'.txt', '.md', '.markdown', '.rst', '.html', '.htm'}:
            # Text files
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        
        elif ext == '.json':
            import json
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return json.dumps(data, indent=2)
        
        elif ext in {'.yaml', '.yml'}:
            try:
                import yaml  # type: ignore[import-untyped]
                with open(path, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                    return cast(str, yaml.dump(data, default_flow_style=False))
            except ImportError:
                # Fallback to text reading
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
        
        elif ext == '.csv':
            import csv
            content = []
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.reader(f)
                for row in reader:
                    content.append(', '.join(row))
            return '\n'.join(content)
        
        elif ext == '.pdf':
            try:
                import PyPDF2
                content = []
                with open(path, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    for page in pdf_reader.pages:
                        content.append(page.extract_text())
                return '\n\n'.join(content)
            except ImportError:
                raise ValueError("PyPDF2 required for PDF files. Install with: pip install PyPDF2")
        
        elif ext in {'.docx', '.doc'}:
            try:
                from docx import Document as DocxDocument
                doc = DocxDocument(path)
                paragraphs = [p.text for p in doc.paragraphs]
                return '\n'.join(paragraphs)
            except ImportError:
                raise ValueError("python-docx required for Word files. Install with: pip install python-docx")
        
        else:
            # Fallback to text
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
    
    def _extract_content_from_response(
        self,
        response: requests.Response,
        content_type: str
    ) -> str:
        """Extract text content from HTTP response"""
        
        if 'text/html' in content_type:
            # HTML content
            try:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.text, 'html.parser')
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                return cast(str, soup.get_text(separator='\n', strip=True))
            except ImportError:
                # Fallback to raw text
                return cast(str, response.text)
        
        elif 'application/json' in content_type:
            # JSON content
            try:
                data = response.json()
                import json
                return cast(str, json.dumps(data, indent=2))
            except:
                return cast(str, response.text)
        
        elif 'text/' in content_type:
            # Plain text
            return cast(str, response.text)
        
        else:
            # Try to decode as text
            try:
                return cast(str, response.text)
            except:
                raise ValueError(f"Unsupported content type: {content_type}")
