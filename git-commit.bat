@echo off
echo Committing and pushing changes to Discord Settings page...

cd %~dp0
git add frontend/src/pages/DiscordSettingsPage.jsx
git add frontend/src/components/discord/RolePingConfig.jsx
git commit -m "Modernize Discord Settings page UI with cleaner design"
git push origin EA-1.3

echo Done!
pause
