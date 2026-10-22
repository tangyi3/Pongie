# Put Pongie online (no coding needed)

## Option A: Test on your own wifi (5 minutes, friends must be on the same wifi)
1. Install Node.js (nodejs.org, the "LTS" button) on your computer.
2. Open this folder in Terminal / Command Prompt and run:  npm install   then   node server.js
3. Find your computer's wifi address (e.g. 192.168.1.23). On every phone open  http://192.168.1.23:3000
4. One person taps Multiplayer > Create room. Others tap Join and type the 4-letter code.

## Option B: Free hosting on Render (friends anywhere)
1. Make a free account at github.com, click New repository, name it "pongie", then "uploading an existing file" and drag in EVERYTHING in this folder (server.js, sandbox.js, flow.js, package.json, the public folder). Commit.
2. Make a free account at render.com. Click New > Web Service > connect your GitHub > pick "pongie".
3. Settings: Build Command  npm install   Start Command  node server.js   Instance type: Free. Click Deploy.
4. After a couple of minutes Render gives you an address like https://pongie.onrender.com. Open it on your iPhone, tap Share > Add to Home Screen. Send the same link to friends.
5. Free tier sleeps after ~15 minutes idle; the first visit then takes ~30 seconds to wake. Rooms are lost when it restarts.

Always open the game from the server link (not the Claude preview), because online play connects to the same address automatically.

## Updating an existing Render site
Replace server.js, sandbox.js, flow.js and public/index.html (and public/sw.js) on GitHub, delete engine.js (no longer used), then commit. Render redeploys by itself. The server reads the rules from public/index.html, so keep that file in place.

## Quick Match
Players tap Quick Match and wait in a queue per rule style. After about 12 seconds (or as soon as 4 players are waiting) a table starts and AI fills any empty seats. Everyone starts with 300 table chips. Optional setting on Render: PONGIE_QM_MS (milliseconds to wait, default 12000).
Updating: replace server.js, flow.js, sandbox.js, public/index.html and public/sw.js.
