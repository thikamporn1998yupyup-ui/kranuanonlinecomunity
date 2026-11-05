'use strict';
const {spawnSync}=require('node:child_process');
const result=spawnSync(process.execPath,['--test','tests/system.test.cjs','dispatch-addon/test.cjs','performance-tests/server.test.cjs','performance-tests/client.test.cjs','performance-tests/worker.test.cjs','performance-tests/dispatch.test.cjs'],{cwd:__dirname,stdio:'inherit',env:{...process.env,KRANUAN_TEST_SQLITE:'1'}});
process.exitCode=result.status??1;
