# Firewall AI - Agentic SDLC for Multi-Cloud Security

## Overview

Firewall AI is an intelligent, agentic security auditing platform that automates the end-to-end firewall rule analysis process using advanced AI workflows. Built on the principle of "AI proposes, Senior Architect disposes," it combines LangGraph-powered orchestration with Gemini 1.5 Pro's reasoning capabilities to provide enterprise-grade firewall auditing. (Current UI focus: Aviatrix DCF only.)

## Core Architecture: Agentic SDLC

The application implements an **Agentic Workflow** using LangGraph to automate the complete security audit lifecycle:

### 🔄 **Ingestion Layer**
- **Manual Entry**: Direct rule input through the web interface
- **File Uploads**: Support for CSV, JSON, and vendor-specific configuration files
- **API Integration**: Automated pulls from:
  - Google Cloud Platform (VPC Firewalls, Cloud Armor)
  - Microsoft Azure (NSGs, Azure Firewall)
  - Aviatrix Distributed Cloud Firewall (SmartGroups, WebGroups)

### 🔧 **Normalization Engine**
- **Universal JSON Schema**: Converts vendor-specific rules into standardized format
- **Aviatrix-first**: UI and provider selection are currently restricted to Aviatrix DCF
- **Schema Validation**: Ensures consistent AI analysis across all rule types

### 🧠 **The Brain: Gemini 1.5 Pro Auditor**
- **Intent-Based Analysis**: Compares live rules against business security requirements
- **Violation Detection**: Identifies rules that conflict with organizational policies
- **Smart Recommendations**: Provides actionable remediation steps with business context

## Advanced Performance & Cost Optimizations

### 💾 **Context Caching**
- Stores large firewall configurations in memory
- **90% reduction** in input token costs
- **Significant latency improvements** for repeated analyses

### 📦 **Batch Processing**
- Vertex AI Batch Prediction for large-scale audits
- **50% cost reduction** compared to real-time processing
- Asynchronous processing of 10,000+ rules overnight

### 🔍 **Semantic Caching**
- Vector database storage of approved fixes
- Instant retrieval for similar rule patterns
- **Zero LLM calls** for cached recommendations

## Human-in-the-Loop (HITL) & Learning

### 🎯 **Intent-Based Networking**
- Define business security requirements (e.g., "Isolate Finance segment")
- AI identifies rule violations against stated intent
- Context-aware recommendations aligned with business goals

### 🔍 **Safe-Apply Diff View**
- **Magnificent Interface**: Next.js with Shadcn UI components
- Side-by-side comparison of current vs. proposed configurations
- Monaco Editor integration for code-centric review
- Risk assessment and impact analysis

### 📈 **Learning Loop**
- **RAG System**: Retrieval-Augmented Generation learns from decisions
- Logs all Approve/Reject actions for pattern recognition
- Continuous improvement of recommendation accuracy
- Personalized security policies based on team preferences

## Multi-Cloud Expansion: Aviatrix DCF

### 🌐 **Distributed Cloud Firewall Support**
- Full integration with Aviatrix SmartGroups and WebGroups
- Cross-cloud traffic peering analysis (AWS ↔ Azure ↔ GCP)
- Global policy redundancy detection
- Multi-cloud security posture assessment

> Note: The current frontend experience is Aviatrix-only while the backend retains multi-cloud models.

### 🔗 **Cross-Cloud Intelligence**
- Identifies redundant rules across cloud providers
- Optimizes traffic flows for cost and security
- Unified security dashboard for multi-cloud environments

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ingestion     │───▶│  Normalization  │───▶│   AI Analysis   │
│   • Manual      │    │  • JSON Schema  │    │   • Gemini 1.5   │
│   • Files       │    │  • Validation   │    │   • Intent       │
│   • APIs        │    │  • Multi-vendor │    │   • Violations   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Context Caching │    │ Batch Processing│    │ Semantic Cache  │
│ • 90% Cost Save │    │ • Async Audits  │    │ • Instant Results│
│ • Low Latency   │    │ • 50% Cost Save │    │ • Vector DB      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Human-in-the-Loop Interface                 │
│   • Intent Definition  • Diff View  • Learning Loop        │
│   • Next.js + Shadcn   • Monaco Editor • RAG System        │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Senior Architect Benefit |
|-----------|------------|--------------------------|
| **Logic** | LangGraph + Gemini 1.5 Pro | Handles complex, multi-step reasoning |
| **Knowledge** | RAG (Vertex AI Search) | Grounds AI in company-specific security policies |
| **Economy** | Context Caching | Massive cost reduction for large firewall files |
| **Scale** | Batch Prediction | Audits 10,000+ rules asynchronously overnight |
| **Interface** | Next.js + Monaco Editor | High-trust, code-centric "Command Center" |

## Key Features

### 🔒 **Security Auditing**
- Real-time rule analysis and violation detection
- Historical trend analysis and drift detection
- Compliance reporting against industry standards

### 🤖 **AI-Powered Intelligence**
- Natural language intent processing
- Automated remediation suggestions
- Risk scoring and prioritization

### 🌐 **Multi-Cloud Support**
- Unified dashboard for all cloud providers
- Cross-cloud policy optimization
- Centralized security management

### 📊 **Analytics & Reporting**
- Executive dashboards with security metrics
- Automated compliance reports
- Audit trails and change tracking

### 🔄 **Integration Capabilities**
- RESTful APIs for third-party tools
- Webhook notifications for critical events
- Export capabilities for various formats

## Authentication (Basic Auth)

The frontend requires a login. Default credentials:

- **Username:** `admin`
- **Password:** `admin123`

You can override these via environment variables in the backend:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## UI Navigation

The main workspace is organized into tabs:

- **Firewall audit workspace**: Rule intake, audit setup, results, diff, and rules list
- **System control center**: Health checks for core services and AI cache performance

## Project Structure

```
firewall-ai/
├── terraform/                 # Infrastructure as Code
│   ├── main.tf               # Main Terraform configuration
│   ├── variables.tf          # Variable definitions
│   ├── outputs.tf            # Output definitions
│   ├── versions.tf           # Provider and Terraform versions
│   ├── terraform.tfvars      # Terraform variables (gitignored)
│   ├── environments/         # Environment-specific configurations
│   └── modules/              # Reusable Terraform modules
├── backend/                  # Python/Flask backend application
│   ├── langgraph/            # Agentic workflow orchestration
│   ├── normalization/        # Rule normalization engine
│   ├── caching/              # Context & semantic caching
│   └── api/                  # REST API endpoints
├── frontend/                 # Next.js frontend application
│   ├── components/           # React components (Shadcn UI)
│   ├── pages/                # Next.js pages
│   ├── lib/                  # Utility functions
│   └── public/               # Static assets
├── .github/                  # GitHub Actions workflows
│   ├── workflows/            # CI/CD pipelines
│   └── dependency-review-config.yml
├── .terraform-docs.yml       # Terraform documentation config
├── .tflint.hcl              # Terraform linting config
└── README.md                # This file
```

## Prerequisites

*   [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
*   [Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli) (version >= 1.6.0)
*   A Google Cloud project with billing enabled.

## Development Setup

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd firewall-ai
   ```

2. **Set up Python environment (for backend):**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up Node.js environment (for frontend):**
   ```bash
   cd frontend
   npm install
   ```

4. **Start the development servers:**
   Use the provided startup scripts to run both backend and frontend simultaneously:
   
   **Linux/macOS:**
   ```bash
   # Full-featured startup with health checks
   ./start-dev.sh
   
   # Or simple startup (just starts both services)
   ./start-simple.sh
   ```
   
   **Windows:**
   ```batch
   start-dev.bat
   ```
   
   This will start:
   - Backend Flask server on http://localhost:8080
   - Frontend Next.js server on http://localhost:3000

### Infrastructure Setup

1. **Configure the environment:**
   Copy the `terraform/terraform.tfvars.example` to `terraform/environments/dev/terraform.tfvars` and fill in the required values. At a minimum, you need to provide your `project_id`.

2. **Create the GCS backend bucket:**
   The Terraform state is stored in a GCS bucket. You can create it by running the `create_bucket.sh` script. Make sure to update the `PROJECT_ID` in the script first.
   ```bash
   bash create_bucket.sh
   ```

3. **Initialize Terraform:**
   ```bash
   cd terraform
   terraform init
   ```

4. **Review and apply the Terraform plan:**
   ```bash
   terraform plan -var-file="environments/dev/terraform.tfvars"
   terraform apply -var-file="environments/dev/terraform.tfvars"
   ```

5. **Build and deploy the application images:**
   The `terraform apply` command will output the `gcloud` commands to build and deploy the backend and frontend images. Run these commands to deploy your application.

## Usage

Once the application is deployed, you can access the frontend by navigating to the URL provided in the output of the `terraform apply` command. The backend API will be available at the URL also provided in the output.

## Testing

### Running Tests Locally

**Backend tests:**
```bash
cd backend
python -m pytest
```

**Frontend tests:**
```bash
cd frontend
npm test
```

**Infrastructure tests:**
```bash
cd terraform
terraform plan -var-file="environments/dev/terraform.tfvars"  # Validates configuration
```

### Test Coverage

- **Unit Tests:** Individual component testing
- **Integration Tests:** End-to-end workflow testing
- **Infrastructure Tests:** Terraform validation and security scanning

## CI/CD

This project uses GitHub Actions for continuous integration and deployment. The following workflows are configured:

### Infrastructure CI
- **Terraform Validation:** Syntax and configuration validation
- **Security Scanning:** Infrastructure as Code security analysis with tfsec
- **Code Quality:** Terraform formatting and linting with tflint

### Application CI (when code is present)
- **Backend Testing:** Python unit and integration tests
- **Frontend Testing:** JavaScript/TypeScript testing and linting
- **Security Scanning:** Dependency vulnerability scanning
- **Code Quality:** Static analysis and code coverage

### Deployment
- **Automated Deployment:** Infrastructure deployment on main branch
- **Environment Promotion:** Dev → Staging → Production pipeline

## Security

### Infrastructure Security
- **Network Security:** VPC isolation and Cloud Armor protection
- **Access Control:** Least privilege IAM roles and service accounts
- **Secret Management:** Secure storage using Secret Manager
- **Monitoring:** Continuous security monitoring and alerting

### Application Security
- **Dependency Scanning:** Automated vulnerability detection
- **Code Analysis:** Static security testing (SAST)
- **Container Security:** Image scanning and hardening
- **Runtime Security:** Web Application Firewall (WAF) protection

### Compliance
- **Audit Logging:** Comprehensive audit trails
- **Data Encryption:** At-rest and in-transit encryption
- **Access Reviews:** Regular permission and access reviews

## Terraform Modules

The infrastructure is organized into the following Terraform modules:

*   `terraform/modules/cloud-run`: Deploys the backend and frontend Cloud Run services.
*   `terraform/modules/firestore`: Sets up the Firestore database and indexes.
*   `terraform/modules/monitoring`: Configures monitoring, logging, and alerting.
*   `terraform/modules/networking`: Creates the VPC, subnet, and VPC Access Connector.
*   `terraform/modules/scheduler`: Creates the Cloud Scheduler jobs.
*   `terraform/modules/secrets`: Manages secrets using Secret Manager.
*   `terraform/modules/storage`: Creates the GCS buckets.
*   `terraform/modules/vertex-ai`: Configures Vertex AI resources.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and security scans
5. Submit a pull request

### Code Quality Standards
- Follow Terraform best practices
- Write comprehensive tests
- Ensure security compliance
- Maintain documentation

## License

[Specify your license here]