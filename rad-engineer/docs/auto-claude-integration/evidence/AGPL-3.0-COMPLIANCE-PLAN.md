# AGPL-3.0 Compliance Plan for Auto-Claude Integration

**Project**: Auto-Claude + rad-engineer-v2 Integration
**License**: GNU Affero General Public License v3.0
**Created**: 2026-01-11
**Status**: Compliance Plan Defined

---

## License Overview

Auto-Claude is licensed under AGPL-3.0, which requires:

1. **Source Code Availability**: Modified source code must be made available
2. **Network Server Provision**: If running as network server, must provide source to users
3. **Copyright Notices**: Must retain all copyright notices
4. **License Display**: Must provide copy of AGPL-3.0 license
5. **Legal Notices**: Must display appropriate legal notices in interactive interface

---

## Compliance Requirements

### 1. Source Code Availability ✓

**Requirement**: Modified versions must be distributed with source code.

**Compliance Strategy**:
- All modifications will be kept in public repository: rad-engineer-v2
- Integration code in `rad-engineer/src/ui-adapter/` will be open source
- No proprietary modifications without separate commercial license

**Actions**:
- [x] Fork Auto-Claude repository
- [ ] Maintain rad-engineer-integration branch with all modifications
- [ ] Document all changes in CHANGELOG.md
- [ ] Provide GitHub repository URL for source access

### 2. Network Server Provision ✓

**Requirement**: If modified version runs on network server, must provide source to users.

**Compliance Strategy**:
- This is a desktop application (Electron), not a network server
- If deployed as SaaS in future, will provide source code download link in UI
- Will add "View Source" link in Help menu if network deployment occurs

**Current Status**: Not applicable (desktop app only)

### 3. Copyright Notices ✓

**Requirement**: Must retain all copyright notices from Auto-Claude.

**Compliance Strategy**:
- Preserve all copyright headers in Auto-Claude files
- Add rad-engineer-v2 copyright to new files:
  ```
  // Copyright (C) 2026 Rad Engineering Platform
  // AGPL-3.0 License - See LICENSE file
  ```
- Do not remove any existing copyright notices

**Actions**:
- [x] Keep Auto-Claude LICENSE file
- [ ] Add NOTICE.txt with attribution to Auto-Claude project
- [ ] Retain copyright headers in all Auto-Claude source files

### 4. License Display ✓

**Requirement**: Must provide copy of AGPL-3.0 license with distribution.

**Compliance Strategy**:
- Keep Auto-Claude's LICENSE file in repository root
- Add license reference in package.json
- Display license in About dialog of application

**Actions**:
- [x] Preserve LICENSE file at repository root
- [ ] Add "license": "AGPL-3.0" to package.json
- [ ] Add "View License" button in Help → About dialog

### 5. Interactive UI Legal Notices ✓

**Requirement**: Display appropriate legal notices in interactive interface.

**Compliance Strategy**:
- Add legal notice in About dialog:
  ```
  Auto-Claude + rad-engineer-v2 Integration
  Copyright (C) 2024 Andre Mikalsen (Auto-Claude)
  Copyright (C) 2026 Rad Engineering Platform (rad-engineer-v2)

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, version 3.

  This program is distributed WITHOUT ANY WARRANTY.
  See LICENSE file for details.
  ```

**Actions**:
- [ ] Add About dialog with legal notice
- [ ] Add "View License" link in About dialog
- [ ] Display warranty disclaimer

---

## Implementation Checklist

### Phase 0 (PoC)
- [x] Fork Auto-Claude repository
- [x] Preserve LICENSE file
- [x] Document compliance plan

### Phase 1 (Core Integration)
- [ ] Add license field to package.json
- [ ] Add copyright headers to new files
- [ ] Create NOTICE.txt with attributions

### Phase 3 (Advanced Features)
- [ ] Add About dialog with legal notice
- [ ] Add "View License" button
- [ ] Add "View Source Code" button (links to GitHub)

### Phase 4 (Polish & Production)
- [ ] Audit all files for copyright compliance
- [ ] Test About dialog displays correctly
- [ ] Document compliance in README.md

---

## Risk Mitigation

### Potential Issues

1. **Removing Auto-Claude Python backend**
   - Risk: Unclear if this constitutes "modification" requiring source distribution
   - Mitigation: Keep all source in repository, document removal in CHANGELOG

2. **Mixing AGPL-3.0 (Auto-Claude) with MIT (rad-engineer-v2)**
   - Risk: License compatibility
   - Mitigation: AGPL-3.0 is copyleft, so integrated work must be AGPL-3.0
   - Decision: Entire integrated application is AGPL-3.0

3. **Commercial licensing**
   - Risk: AGPL-3.0 requires source distribution
   - Mitigation: Contact Auto-Claude author for dual licensing if closed-source needed
   - Current: Use AGPL-3.0 for all distributions

---

## References

- AGPL-3.0 Full Text: See LICENSE file
- GNU License Guide: https://www.gnu.org/licenses/agpl-3.0.html
- Auto-Claude Repository: https://github.com/AndyMik90/Auto-Claude
- AGPL FAQ: https://www.gnu.org/licenses/gpl-faq.html#AGPLv3

---

**Status**: Compliance plan defined and approved
**Next**: Implement compliance actions during integration phases
**Owner**: Claude Orchestrator
