#!/bin/sh
set -e
node -e "(async()=>{const {Client}=require('pg');const c=new Client();try{await c.connect();console.log('SIDE_CAR_OK')}catch(e){console.error('SIDE_CAR_FAIL',e.message)}finally{await c.end().catch(()=>{})}})();"
