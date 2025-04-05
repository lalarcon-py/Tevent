#!/bin/bash
echo "Committing and pushing changes to Discord Settings page..."

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

git add frontend/src/pages/DiscordSettingsPage.jsx
git add frontend/src/components/discord/RolePingConfig.jsx
git commit -m "Modernize Discord Settings page UI with cleaner design"
git push origin EA-1.3

echo "Done!"
read -p "Press enter to continue"
