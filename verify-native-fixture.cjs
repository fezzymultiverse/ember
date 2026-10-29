/* Source-only patcher test; no SDK, signing material or real Android project is touched. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ember-android-fixture-')),android=path.join(temp,'android');
const write=(p,t)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,t);};
const tree=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(path.join(dir,e.name)):[path.join(dir,e.name)]);
try{
 write(path.join(temp,'package.json'),JSON.stringify({version:require('../package.json').version}));
 write(path.join(android,'build.gradle'),"buildscript { dependencies { classpath 'com.android.tools.build:gradle:8.2.1' } }\nallprojects { repositories { google(); mavenCentral() } }\n");
 write(path.join(android,'app/build.gradle'),"apply plugin: 'com.android.application'\nandroid {\n defaultConfig { versionCode 1; versionName \"1.0\" }\n buildTypes { release { minifyEnabled false } }\n}\ndependencies {\n}\n");
 write(path.join(android,'app/src/main/AndroidManifest.xml'),'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity"></activity></application></manifest>');
 const run=()=>{const r=spawnSync('python3',[path.join(root,'scripts/apply_android_patch.py'),android,path.join(root,'android_patch')],{encoding:'utf8',env:{...process.env,NEWPIPE_VERSION:''}});process.stdout.write(r.stdout);process.stderr.write(r.stderr);assert.equal(r.status,0);};
 run();const before=Object.fromEntries(tree(android).map(p=>[path.relative(android,p),fs.readFileSync(p,'utf8')]));run();const after=Object.fromEntries(tree(android).map(p=>[path.relative(android,p),fs.readFileSync(p,'utf8')]));assert.deepEqual(after,before,'patcher idempotence');
 assert.equal(Object.keys(after).filter(p=>p.endsWith('.kt')).length,15);
 assert(after['app/src/main/AndroidManifest.xml'].includes('SystemForegroundService'));
 assert(after['app/build.gradle'].includes('versionName "1.10.17"'));
 console.log('PASS native patcher applies twice identically to disposable fixture; 15 Kotlin sources, manifest service and package version checked.');
 console.log('NOT TESTED: Kotlin compilation, Gradle dependency resolution, real permissions or Android device behavior.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
