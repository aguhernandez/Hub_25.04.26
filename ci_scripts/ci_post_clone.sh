#!/bin/bash
set -e
npm install
npm install @capacitor/cli
npx cap sync ios
