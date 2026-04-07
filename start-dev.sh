#!/bin/bash
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH"
exec npm run dev -- --port 3000
