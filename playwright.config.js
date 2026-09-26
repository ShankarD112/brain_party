import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:90000,workers:1,use:{screenshot:"only-on-failure",trace:"retain-on-failure",viewport:{width:1440,height:1000},launchOptions:{executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']},baseURL:'http://127.0.0.1:5173'},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true}});

