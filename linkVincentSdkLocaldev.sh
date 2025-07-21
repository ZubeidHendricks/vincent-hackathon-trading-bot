#!/bin/zsh
# Check if LOCAL_VINCENT_SDK_PATH is set
if [ -z "$LOCAL_VINCENT_SDK_PATH" ]; then
  echo "Error: LOCAL_VINCENT_SDK_PATH environment variable is not set."
  echo "Use 'pnpm link-local-vincent-sdk-dev' and configure your .env file like .env.example.development"
  exit 1
fi

echo "Switching to $LOCAL_VINCENT_SDK_PATH"
cd "$LOCAL_VINCENT_SDK_PATH" || {
  echo "Error: Failed to change directory to $LOCAL_VINCENT_SDK_PATH."
  exit 1
}
pnpm link --global
cd - || exit 1
pnpm link @lit-protocol/vincent-sdk
