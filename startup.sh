#!/bin/bash

# Get the user's default shell
USER_SHELL=$(dscl . -read /Users/$USER UserShell | sed 's/UserShell: //')

# Start load balancer in a new terminal
osascript -e "tell app \"Terminal\" to do script \"$USER_SHELL -l -c 'cd \\\"$PWD\\\" && PORT=5000 npm run start:lb'\""
echo "Started load balancer on port 5000"

# Start three instances of the main app on different ports
for port in {3000..3002}
do
    osascript -e "tell app \"Terminal\" to do script \"$USER_SHELL -l -c 'cd \\\"$PWD\\\" && PORT=$port npm start'\""
    echo "Started application instance on port $port"
    sleep 1
done
