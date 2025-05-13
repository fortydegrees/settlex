// Quick fix for main page routing
// Replace contents of /app/page.js with:

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Settlers of Catan Online</h1>
      <div className="flex gap-4">
        <a 
          href="/catana" 
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Play Local Game
        </a>
        <a 
          href="/catana" 
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          Join Online Game
        </a>
      </div>
    </main>
  );
}

// Fix for connected components bug in Moves.js
// Replace line 305 with:
if (aIndex > -1 && bIndex > -1 && aIndex !== bIndex){
  // Properly merge the two components
  const mergedComponent = [
    ...G.connectedComponents[playerID][aIndex],
    ...G.connectedComponents[playerID][bIndex]
  ];
  
  // Remove the old components
  const newComponents = G.connectedComponents[playerID].filter(
    (comp, index) => index !== aIndex && index !== bIndex
  );
  
  // Add the merged component
  newComponents.push(mergedComponent);
  
  G.connectedComponents[playerID] = newComponents;
}

// Fix for robber stage transition
// In rollDice function, after line 437:
if (diceScore === 7) {
  // ... existing code ...
  events.setStage("moveRobber");
  // Remove the console.log and commented out code
} else {
  // ... existing resource distribution code ...
  events.setStage('postRoll');
}

// Add to moveRobber function in Moves.js to properly transition:
export const moveRobber = {
  move: (context, tileID) => {
    const { G, random, ctx, events } = context;
    
    // Move robber
    G.robberTile = tileID;
    
    // ... stealing logic ...
    
    // Properly transition based on original stage
    if (ctx.phase === "main" && ctx.activePlayers[ctx.currentPlayer] === "preRoll") {
      events.setStage('preRoll');
    } else {
      events.setStage('postRoll');
    }
  }
}
