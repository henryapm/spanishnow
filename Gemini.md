# Guidelines to design a web application: The Spanish Suite

**Version:** 1.0
**Last Updated:** 2026

## 1. Specification-Driven Development Workflow
**CRITICAL RULE FOR AI ASSISTANTS:** 
Before writing code or assuming the implementation details for *any* new feature, the AI must explicitly ask the user for their desired specifications, requirements, and edge cases. 

The workflow is strictly:

1. Ask for feature specifications.
2. Draft the updates to this SDD (Data models, API endpoints, logic).
3. Explicitly list and **number any assumptions** made during the drafting phase.
4. Ask the user to review the numbered assumptions and indicate which ones need modification by referencing their numbers.
5. Get user approval on the SDD updates and assumptions.
6. Write the code based *only* on the agreed-upon SDD.
7. Don't give me the files on the chat, use the diff or ask me to open the files needed first before you create files that I have to manually edit or combine with existing ones.
8. Let's work on one file at the time.
9. If creating a new feature/component/page that will change the UI always provide an ASCII mockup before writing any html/CSS.
10. if creating a function it most be securely implemented, no user can inject malicious code to my db or abuse my api.
11. when updating functionality lets do one concern at the time and walk me through the changes before just suggesting diff to be added without explaining anything.


## 2. Overview
This document outlines the software architecture and design for "The Spanish Suite", an interactive web application designed to help users learn and practice Spanish. The application provides reading exercises, and spaced-repetition (SRS) flashcards and AI-driven conversation practice.