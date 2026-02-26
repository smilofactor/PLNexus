PLNexus

PLNexus is a command-line market data discovery tool designed to retrieve stock market data through a modular, adapter-based architecture. The system is built to support multiple external APIs while keeping core domain logic isolated from infrastructure concerns.

The project emphasizes boundary enforcement, extensibility, and auditability, and serves as both a working tool and an architectural experiment in safe system composition.

Purpose

PLNexus explores how to design a flexible market data system that can:

Integrate with different data providers without modifying core logic

Isolate external API volatility from domain behavior

Support experimentation while maintaining clear architectural boundaries

The application currently runs from the command line. A graphical interface is planned but not yet implemented.

Architecture Overview

PLNexus follows a ports-and-adapters (hexagonal) architecture:

Domain Layer
Contains core use cases, domain logic, and port definitions.
The domain has no dependency on infrastructure or external APIs.

Infrastructure Layer
Implements adapters that connect domain-defined ports to external systems (e.g., market data APIs).

Orchestration Layer
A central entry point wires domain logic to infrastructure adapters, manages lifecycle concerns, and initializes shared telemetry.

Architectural Invariant:

Domain code depends only on domain abstractions. Infrastructure depends on the domain, never the reverse.

This invariant was intentionally designed and verified to prevent infrastructure leakage into business logic.

Key Characteristics

Command-Line Driven – Operates as a CLI application for data retrieval and experimentation

Highly Modular – External APIs are integrated via swappable adapters

Boundary-Controlled – Clear separation between domain logic and infrastructure

Extensible by Design – New providers can be added without modifying core logic

Audit-Friendly – Dependency direction and responsibilities are explicit and inspectable

Development Approach

PLNexus was developed using AI-assisted coding under human-defined architectural constraints.

The system design, module boundaries, dependency direction, and orchestration responsibilities were explicitly architected and enforced. Generated code was reviewed and iterated to ensure adherence to these constraints.

This project reflects a human-in-the-loop engineering approach, where AI is used as an implementation aid rather than an autonomous decision-maker.

Current Status

Core CLI functionality is implemented and operational

Market data retrieval via adapters is functional

GUI layer is not yet implemented

Project is experimental and not intended for production trading use

Disclaimer

PLNexus is provided for educational and experimental purposes only.
It is not intended for production trading or financial decision-making.

Use of this software is at your own risk. See DISCLAIMER.md for full legal terms.
