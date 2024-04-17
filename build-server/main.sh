#!/bin/bash

export GIT_REPOSITORY_URL = "$GIT_REPOSITORY_URL"


echo "Cloning the Git URL"
git clone "$GIT_REPOSITORY_URL" /home/app/output

exec node script.js