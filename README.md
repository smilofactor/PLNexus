# PLNexus

**PLNexus** is a command-line market data discovery tool designed around a strict, boundary-first architecture.  
It retrieves stock market data through a modular, adapter-based system while keeping core domain logic isolated from infrastructure concerns.

The project serves both as a **working CLI tool** and as an **architectural experiment in safe system composition**.

---

## Purpose

PLNexus explores how to design a flexible market data system that can:

- Integrate with multiple external data providers without modifying core logic  
- Isolate external API volatility from domain behavior  
- Enforce dependency direction as a structural invariant  
- Support experimentation without sacrificing architectural clarity  

The application currently runs from the command line.  
A graphical user interface is planned but not yet implemented.

---

## Architecture Overview

PLNexus follows a **Ports-and-Adapters (Hexagonal) Architecture**, emphasizing explicit boundaries and controlled dependency flow.

### Domain Layer

- Contains core use cases, business logic, and port definitions  
- Defines *what* the system does, not *how* it talks to external systems  
- Has **no dependency** on infrastructure or external APIs  

### Infrastructure Layer

- Implements adapters that fulfill domain-defined ports  
- Connects to external systems such as market data APIs  
- Depends on the domain layer — **never the reverse**

### Orchestration Layer

- Serves as the central application entry point  
- Wires domain logic to infrastructure adapters  
- Manages lifecycle concerns and initializes shared telemetry  

---

## Architectural Invariant

> **Domain code depends only on domain abstractions.  
> Infrastructure depends on the domain — never the reverse.**

This invariant was intentionally designed and verified to prevent infrastructure leakage into business logic and to preserve long-term system maintainability.

---

## Key Characteristics

- **Command-Line Driven** — Designed for CLI-based data retrieval and experimentation  
- **Highly Modular** — External APIs are integrated through swappable adapters  
- **Boundary-Controlled** — Clear separation between domain logic and infrastructure  
- **Extensible by Design** — New providers can be added without modifying core logic  
- **Audit-Friendly** — Dependency direction and responsibilities are explicit and inspectable  

---

## Development Approach

PLNexus was developed using **AI-assisted coding under human-defined architectural constraints**.

- The system design, module boundaries, and dependency direction were explicitly architected  
- AI was used as an implementation aid, not as an autonomous designer  
- Generated code was reviewed and iterated to ensure compliance with architectural intent  

This project reflects a **human-in-the-loop engineering approach**, emphasizing judgment, verification, and system-level reasoning.

---

## Current Status

- Core CLI functionality is implemented and operational  
- Market data retrieval via adapters is functional  
- GUI layer is not yet implemented  
- Test coverage is minimal  
- Experimental and **not intended for production trading use**

---

## Disclaimer

PLNexus is provided for **educational and experimental purposes only**.

It is **not intended for production trading or financial decision-making**.  
Use of this software is at your own risk.

See `DISCLAIMER.md` for full legal terms.
