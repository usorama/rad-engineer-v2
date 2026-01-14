// Simple Node.js test for E2E API verification
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/463EC43F842D7F56CFB2F64341A5AE48');

let msgId = 1;

ws.on('open', async () => {
  console.log('🔌 Connected to Electron app\n');

  // Enable Runtime
  ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));

  setTimeout(() => {
    // Test 1: Check if APIs exist
    console.log('📋 Test 1: Checking API namespaces...');
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: `JSON.stringify({
          planning: typeof window.electronAPI?.planning,
          vac: typeof window.electronAPI?.vac,
          learning: typeof window.electronAPI?.learning
        })`,
        returnByValue: true
      }
    }));

    // Test 2: Check planning methods
    setTimeout(() => {
      console.log('\n📋 Test 2: Checking planning methods...');
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: `JSON.stringify({
            startIntake: typeof window.electronAPI?.planning?.startIntake,
            submitAnswers: typeof window.electronAPI?.planning?.submitAnswers,
            generatePlan: typeof window.electronAPI?.planning?.generatePlan
          })`,
          returnByValue: true
        }
      }));

      // Test 3: Call planning API
      setTimeout(() => {
        console.log('\n📋 Test 3: Calling planning.startIntake()...');
        ws.send(JSON.stringify({
          id: msgId++,
          method: 'Runtime.evaluate',
          params: {
            expression: `(async () => {
              try {
                const result = await window.electronAPI.planning.startIntake();
                return JSON.stringify({ success: true, hasSessionId: !!result.sessionId, data: result });
              } catch (error) {
                return JSON.stringify({ success: false, error: error.message });
              }
            })()`,
            awaitPromise: true,
            returnByValue: true
          }
        }));

        // Test 4: Call VAC API
        setTimeout(() => {
          console.log('\n📋 Test 4: Calling vac.getAllContracts()...');
          ws.send(JSON.stringify({
            id: msgId++,
            method: 'Runtime.evaluate',
            params: {
              expression: `(async () => {
                try {
                  const result = await window.electronAPI.vac.getAllContracts();
                  return JSON.stringify({ success: true, hasContracts: Array.isArray(result.contracts), count: result.contracts?.length });
                } catch (error) {
                  return JSON.stringify({ success: false, error: error.message });
                }
              })()`,
              awaitPromise: true,
              returnByValue: true
            }
          }));

          // Test 5: Call Learning API
          setTimeout(() => {
            console.log('\n📋 Test 5: Calling learning.getDecisionHistory()...');
            ws.send(JSON.stringify({
              id: msgId++,
              method: 'Runtime.evaluate',
              params: {
                expression: `(async () => {
                  try {
                    const result = await window.electronAPI.learning.getDecisionHistory();
                    return JSON.stringify({ success: true, hasDecisions: Array.isArray(result.decisions), count: result.decisions?.length });
                  } catch (error) {
                    return JSON.stringify({ success: false, error: error.message });
                  }
                })()`,
                awaitPromise: true,
                returnByValue: true
              }
            }));

            // Close after all tests
            setTimeout(() => {
              console.log('\n✅ All tests queued!\n');
              setTimeout(() => process.exit(0), 5000);
            }, 2000);
          }, 2000);
        }, 2000);
      }, 2000);
    }, 2000);
  }, 1000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.id && msg.id > 1 && msg.result?.result?.value) {
    const value = msg.result.result.value;
    try {
      const parsed = JSON.parse(value);
      console.log('  ✅ Result:', parsed);
    } catch (e) {
      console.log('  ✅ Result:', value);
    }
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n🔌 Disconnected');
});
