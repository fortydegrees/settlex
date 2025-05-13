# Settlex - Bugs and Action Plan

## Critical Bugs Found:

### 1. Dependency Issues
**Problem**: React version conflicts with `bgio-effects`
```
bgio-effects@0.7.1 requires React 16 or 17 but project uses React 18
```
**Solution**: Either downgrade React or find an alternative to bgio-effects that's compatible with React 18.

### 2. Main Page Not Connected
**Problem**: The main page (`/`) still shows the default Next.js template instead of routing to the game
**Solution**: Update `/app/page.js` to redirect or show game options

### 3. Incomplete Game Loop
**Problem**: Several missing core mechanics:
- No city placement implementation
- Development cards not implemented
- Trading system missing (both player-to-player and bank trades)
- Victory point calculation incomplete
- 7-roll discard mechanic not implemented

### 4. Robber Movement Issues
**Problem**: The robber movement logic is incomplete:
- Missing player stealing UI/selection
- No friendly robber rules
- Stage transitions after robber movement are incomplete

### 5. Connected Components Bug
**Problem**: In `placeRoad` function (line 305):
```javascript
G.connectedComponents[playerID] = Array.from(new Set(G.connectedComponents[playerID].flat()));
```
This flattens all connected components into a single array, losing the separate component tracking.

### 6. Resource Distribution Edge Cases
**Problem**: No validation for:
- Bank running out of resources
- Port trading ratios not implemented
- Resource cards on initial placement not always distributed correctly

### 7. Turn Management Issues
**Problem**: 
- No turn timer implementation despite being defined in settings
- Stage transitions are inconsistent (especially after robber moves)
- End turn logic incomplete

### 8. UI Feedback Problems
**Problem**:
- No visual indication of current player
- Invalid moves don't show error messages
- Resource animations sometimes stagger or fail

## Immediate Action Plan:

### Phase 1: Fix Critical Issues (Week 1)
1. **Fix Dependencies**
   - Upgrade `bgio-effects` or find compatible alternative
   - Update deprecated packages
   - Run `npm audit fix` for security issues

2. **Fix Main Page**
   ```javascript
   // Update /app/page.js to redirect to game
   import { redirect } from 'next/navigation'
   
   export default function Home() {
     redirect('/catana')
   }
   ```

3. **Fix Connected Components Bug**
   - Properly merge connected component arrays without flattening
   - Maintain separate component tracking

### Phase 2: Complete Core Game Loop (Week 2-3)
1. **Implement Cities**
   - Add city upgrade move
   - Update resource production for cities (2x resources)
   - Update victory point calculation

2. **Implement Development Cards**
   - Add development card deck to game state
   - Implement buying development cards
   - Add all card types (Knight, VP, Road Building, etc.)
   - Implement card playing mechanics

3. **Complete Robber Logic**
   - Add player selection UI for stealing
   - Implement friendly robber rules
   - Fix stage transitions after robber moves

### Phase 3: Trading System (Week 3-4)
1. **Bank Trading**
   - Implement 4:1 trading
   - Add port trading logic
   - Create trade UI

2. **Player Trading**
   - Design trade offer system
   - Implement trade validation
   - Add trade UI components

### Phase 4: Polish & Testing (Week 4-5)
1. **UI/UX Improvements**
   - Add current player indicators
   - Implement resource animations
   - Add error messages for invalid moves
   - Improve visual feedback

2. **Game State Validation**
   - Add move validation
   - Implement victory condition checking
   - Add game end logic

3. **Testing**
   - Unit tests for game logic
   - Integration tests for multiplayer
   - User acceptance testing

### Phase 5: Deployment (Week 5)
1. **Production Setup**
   - Configure production server
   - Set up proper websocket connections
   - Deploy to hosting service
   - Add monitoring and logging

## Quick Fixes You Can Do Now:

1. **Update package.json to fix warnings:**
```json
{
  "dependencies": {
    "@use-gesture/react": "^10.2.27",  // Replace react-use-gesture
    // ... other dependencies
  }
}
```

2. **Fix the main page routing**
3. **Remove DEBUG functions from production**
4. **Add basic error handling to moves**

## Testing Checklist:
- [ ] 2-player games work correctly
- [ ] 3-4 player games work correctly
- [ ] Initial placement phase completes properly
- [ ] Resources distribute correctly on dice rolls
- [ ] Robber movement and stealing works
- [ ] Victory conditions trigger game end
- [ ] Multiplayer synchronization works
- [ ] UI updates correctly for all players
