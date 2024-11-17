#!/bin/bash
cd frameworks && \
curl -L https://unpkg.com/rxjs@6.6.0/bundles/rxjs.umd.js > rxjs.umd.js && \
curl -L https://unpkg.com/reflect-metadata@0.1.13/Reflect.js > reflect.js && \
curl -L https://unpkg.com/@angular/core@12.2.16/bundles/core.umd.js > angular-core.umd.js && \
curl -L https://unpkg.com/@angular/common@12.2.16/bundles/common.umd.js > angular-common.umd.js && \
curl -L https://unpkg.com/@angular/compiler@12.2.16/bundles/compiler.umd.js > angular-compiler.umd.js && \
curl -L https://unpkg.com/@angular/platform-browser@12.2.16/bundles/platform-browser.umd.js > angular-platform-browser.umd.js && \
curl -L https://unpkg.com/@angular/platform-browser-dynamic@12.2.16/bundles/platform-browser-dynamic.umd.js > angular-platform-browser-dynamic.umd.js
