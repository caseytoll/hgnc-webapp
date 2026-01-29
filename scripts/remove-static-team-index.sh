#!/bin/bash
# Remove all static team index.html files after build, before deploy
find ./viewer/dist/teams -type f -name 'index.html' -delete
find ./public/teams -type f -name 'index.html' -delete
