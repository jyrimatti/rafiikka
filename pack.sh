#! /usr/bin/env nix-shell
#! nix-shell -I channel:nixos-19.09 -i bash -p nodejs
set -eu

npm install date-fns
npm install date-fns-tz
npm install duration-fns
npm install parcel

npx parcel build entry.js --no-cache --global dateFns
mv dist/entry.js ./datefns.js

