# CropMind — System Diagrams

## 1. Process Flow Diagram — Multi-Agent Orchestration Pipeline

```mermaid
flowchart TD
    A["🧑‍🌾 Farmer submits query<br/>(text + optional image)"] --> B["POST /api/cropagent/diagnose"]
    
    B --> C["Phase 1: Query Parser<br/>(Gemini 2.5 Pro)"]
    C --> C1["Extract: cropType, region,<br/>country, symptoms, intent"]
    
    C1 --> D["Phase 2: CropDiseaseAgent<br/>(Gemini 2.5 Flash)"]
    D --> D1{"Diagnosis<br/>succeeded?"}
    
    D1 -->|Yes| E["Phase 3: Parallel Agents"]
    D1 -->|No| E
    
    E --> F["WeatherAdaptationAgent<br/>(Gemini 2.5 Flash)"]
    E --> G["MarketSubsidyAgent<br/>(Gemini 2.5 Flash)"]
    
    F --> F1["MCP: WeatherTool<br/>(Open-Meteo API)"]
    F --> F2["MCP: CropAlertTool<br/>(AlloyDB)"]
    
    G --> G1["MCP: MarketPriceTool<br/>(AlloyDB)"]
    G --> G2["MCP: SubsidyTool<br/>(AlloyDB)"]
    
    F1 --> H["Phase 4: Conflict Resolution"]
    F2 --> H
    G1 --> H
    G2 --> H
    
    H --> H1{"Conflicts<br/>detected?"}
    H1 -->|"moisture_contradiction"| H2["Weather overrides<br/>disease moisture inference"]
    H1 -->|"treat_vs_replant"| H3["Confidence-weighted<br/>decision"]
    H1 -->|"No conflicts"| I
    H2 --> I
    H3 --> I
    
    I --> J{"Diagnosis<br/>available?"}
    J -->|Yes| K["TreatmentProtocolAgent<br/>(Gemini 2.5 Flash)"]
    J -->|No| L["Phase 5: Synthesis"]
    K --> L
    
    L --> M["SynthesisAgent<br/>(Gemini 2.5 Pro)"]
    M --> N["📋 Unified Recommendation<br/>+ Confidence Score<br/>+ Agent Traces<br/>+ MCP Tool Logs"]
    
    style A fill:#4CAF50,color:#fff
    style N fill:#2196F3,color:#fff
    style D fill:#FF9800,color:#fff
    style F fill:#9C27B0,color:#fff
    style G fill:#009688,color:#fff
    style K fill:#E91E63,color:#fff
    style M fill:#673AB7,color:#fff
```

---

## 2. Use-Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        Farmer["🧑‍🌾 Farmer"]
        Admin["🔧 Admin"]
        Judge["🏆 Judge"]
    end

    subgraph CropMind["🌱 CropMind System"]
        UC1["Diagnose Crop Disease<br/>(text + image upload)"]
        UC2["Get Treatment Plan"]
        UC3["Check Weather Impact"]
        UC4["View Market Prices"]
        UC5["Find Gov. Subsidies"]
        UC6["Search Similar Cases<br/>(pgvector RAG)"]
        UC7["Submit New Case"]
        UC8["Stream Live Diagnosis<br/>(SSE)"]
        UC9["Check System Health"]
        UC10["View MCP Tools"]
        UC11["Database Admin<br/>(via Bastion VM)"]
    end

    subgraph External["☁️ External Services"]
        Vertex["Vertex AI<br/>(Gemini 2.5)"]
        AlloyDB["AlloyDB<br/>(pgvector)"]
        Weather["Open-Meteo<br/>Weather API"]
    end

    Farmer --> UC1
    Farmer --> UC2
    Farmer --> UC3
    Farmer --> UC4
    Farmer --> UC5
    Farmer --> UC6
    Farmer --> UC7
    Farmer --> UC8

    Admin --> UC9
    Admin --> UC10
    Admin --> UC11

    Judge --> UC9
    Judge --> UC1
    Judge --> UC10

    UC1 --> Vertex
    UC2 --> Vertex
    UC3 --> Weather
    UC3 --> AlloyDB
    UC4 --> AlloyDB
    UC5 --> AlloyDB
    UC6 --> AlloyDB
    UC7 --> AlloyDB
    UC7 --> Vertex

    style CropMind fill:#E3F2FD,stroke:#1565C0
    style External fill:#FFF3E0,stroke:#E65100
    style Farmer fill:#4CAF50,color:#fff
    style Admin fill:#FF9800,color:#fff
    style Judge fill:#9C27B0,color:#fff
```

---

## 3. Data Flow Diagram — MCP Tool Integration

```mermaid
flowchart LR
    subgraph Agent["AI Agent Layer"]
        WA["WeatherAdaptation<br/>Agent"]
        MA["MarketSubsidy<br/>Agent"]
    end

    subgraph MCP["MCP Registry<br/>(10s timeout wrapper)"]
        WT["WeatherTool"]
        CAT["CropAlertTool"]
        MPT["MarketPriceTool"]
        ST["SubsidyTool"]
    end

    subgraph Data["Data Sources"]
        API["Open-Meteo API<br/>(external, always up)"]
        DB["AlloyDB<br/>(private VPC)"]
    end

    WA -->|"get_weather"| WT
    WA -->|"get_crop_alerts"| CAT
    MA -->|"get_market_prices"| MPT
    MA -->|"get_subsidies"| ST

    WT -->|"HTTP fetch"| API
    CAT -->|"SQL query<br/>(5s pool timeout)"| DB
    MPT -->|"SQL query<br/>(5s pool timeout)"| DB
    ST -->|"SQL query<br/>(5s pool timeout)"| DB

    style Agent fill:#E8EAF6,stroke:#283593
    style MCP fill:#FFF9C4,stroke:#F57F17
    style Data fill:#E8F5E9,stroke:#2E7D32
```

---

## 4. Deployment Architecture Diagram

```mermaid
flowchart TD
    subgraph Internet["🌐 Internet"]
        User["User Browser"]
        Dev["Developer Laptop"]
    end

    subgraph GCP["Google Cloud Platform (YOUR_PROJECT_ID)"]
        subgraph CloudRun["Cloud Run (us-central1)"]
            API["cropmind-api<br/>Express 5 + React SPA<br/>1Gi / 1vCPU / 300s timeout"]
        end

        subgraph AI["Vertex AI"]
            Gemini["Gemini 2.5 Pro/Flash"]
            Embed["gemini-embedding-001<br/>(768 dimensions)"]
        end

        subgraph VPC["Default VPC (Private Network)"]
            AlloyDB["AlloyDB Cluster<br/>PostgreSQL 15 + pgvector<br/>⚠️ Currently STOPPED"]
            VM["Bastion VM<br/>e2-micro / psql client<br/>⚠️ Currently STOPPED"]
        end

        SM["Secret Manager<br/>DATABASE_URL"]
        AR["Artifact Registry<br/>cropmind/api:v7"]
        CB["Cloud Build<br/>e2-highcpu-8"]
    end

    User -->|"HTTPS"| API
    API -->|"Direct VPC Egress"| AlloyDB
    API -->|"gRPC"| Gemini
    API -->|"gRPC"| Embed
    API -.->|"reads secret"| SM
    
    Dev -->|"SSH tunnel"| VM
    VM -->|"psql (private IP)"| AlloyDB
    Dev -->|"gcloud builds submit"| CB
    CB -->|"push image"| AR
    AR -->|"deploy"| API

    style Internet fill:#ECEFF1,stroke:#546E7A
    style GCP fill:#E3F2FD,stroke:#1565C0
    style CloudRun fill:#C8E6C9,stroke:#2E7D32
    style AI fill:#F3E5F5,stroke:#7B1FA2
    style VPC fill:#FFF3E0,stroke:#E65100
```

---

## 5. Sequence Diagram — Full Diagnosis Request

```mermaid
sequenceDiagram
    actor Farmer
    participant API as Express API
    participant QP as QueryParser<br/>(Gemini 2.5 Pro)
    participant CDA as CropDiseaseAgent<br/>(Gemini 2.5 Flash)
    participant WA as WeatherAgent<br/>(Gemini 2.5 Flash)
    participant MA as MarketAgent<br/>(Gemini 2.5 Flash)
    participant TA as TreatmentAgent<br/>(Gemini 2.5 Flash)
    participant SA as SynthesisAgent<br/>(Gemini 2.5 Pro)
    participant WT as WeatherTool
    participant CT as CropAlertTool
    participant MT as MarketPriceTool
    participant ST as SubsidyTool
    participant DB as AlloyDB
    participant WX as Open-Meteo API

    Farmer->>API: POST /api/cropagent/diagnose
    Note over API: Rate limit check (5 req/min)
    
    API->>QP: Parse raw query
    QP-->>API: {cropType, region, symptoms, intent}
    
    rect rgb(255, 243, 224)
        Note over CDA: Phase 2: Disease Diagnosis
        API->>CDA: Diagnose symptoms
        CDA-->>API: DiagnosisResult (confidence: 85%)
    end
    
    rect rgb(232, 234, 246)
        Note over WA, MA: Phase 3: Parallel Agents
        par Weather Assessment
            API->>WA: Assess weather impact
            WA->>WT: get_weather(region, country)
            WT->>WX: HTTP GET forecast
            WX-->>WT: Weather data
            WT-->>WA: Current + 7-day forecast
            WA->>CT: get_crop_alerts(country, crop)
            CT->>DB: SELECT FROM crop_alerts
            DB-->>CT: Active alerts
            CT-->>WA: Alerts data
            WA-->>API: WeatherAssessment
        and Market Intelligence
            API->>MA: Analyze market
            MA->>MT: get_market_prices(crop, country)
            MT->>DB: SELECT FROM market_prices
            DB-->>MT: Price data
            MT-->>MA: Prices + trends
            MA->>ST: get_subsidies(country, crop)
            ST->>DB: SELECT FROM subsidies
            DB-->>ST: Subsidy programs
            ST-->>MA: Available subsidies
            MA-->>API: MarketIntelligence
        end
    end
    
    rect rgb(252, 228, 236)
        Note over API: Phase 4: Conflict Resolution
        API->>API: resolveConflicts()
    end
    
    rect rgb(232, 245, 233)
        Note over TA: Phase 4b: Treatment Protocol
        API->>TA: Synthesize treatment plan
        TA-->>API: TreatmentProtocol
    end
    
    rect rgb(243, 229, 245)
        Note over SA: Phase 5: Final Synthesis
        API->>SA: Merge all findings
        SA-->>API: Unified Recommendation
    end
    
    API-->>Farmer: Full OrchestratorResult (JSON)
```
