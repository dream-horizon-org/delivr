require 'xcodeproj'

path_to_project = "#{ENV['DOTA_APP_PATH']}/#{ENV['DOTA_PROJECT_NAME']}.xcodeproj"
puts "Dota - Path to project: #{path_to_project}"

begin
  project = Xcodeproj::Project.open(path_to_project)
  puts "Dota - Successfully opened Xcode project."
rescue => e
  puts "Dota - Error opening Xcode project: #{e.message}"
  exit 1
end

main_target = project.targets.first
puts "Dota - Main target: #{main_target.name}"

phase_name = "[Dota] Copy CodePush Bundle"
existing_phase = main_target.shell_script_build_phases.find { |phase| phase.name == phase_name }

if existing_phase
  puts "Dota - Build phase '#{phase_name}' already exists. Updating it."
  phase = existing_phase
else
  puts "Dota - Adding new shell script build phase: #{phase_name}"
  phase = main_target.new_shell_script_build_phase(phase_name)
end

# Set the shell script for the build phase
phase.shell_script = <<-SCRIPT
set -e

# Source the .xcode.env file
ENV_PATH="$PODS_ROOT/../.xcode.env"
if [ -f "$ENV_PATH" ]; then
    source "$ENV_PATH"
    echo "Env variables sourced from $ENV_PATH"
else
    echo "Env file $ENV_PATH not found. Ensure it exists."
fi

echo "Dota - DOTA_COPY_BUNDLE: $DOTA_COPY_BUNDLE"
if [[ "$DOTA_COPY_BUNDLE" == "false" ]]; then
    echo "Dota - Skipping bundle copy as DOTA_COPY_BUNDLE is set to false."
    exit 0
fi

BUNDLE_NAME="main"
DEST="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
BUNDLE_FILE="$DEST/$BUNDLE_NAME.jsbundle"

echo "Dota - BUNDLE_FILE: $BUNDLE_FILE"
echo "Dota - CONFIGURATION: $CONFIGURATION"

if [[ "$CONFIGURATION" != "Release" ]]; then
    echo "Skipping CodePush bundle copy for ${CONFIGURATION} build"
    exit 0
fi


if [[ ! -f "$BUNDLE_FILE" ]]; then
    echo "Warning: Bundle not found at $BUNDLE_FILE"
    exit 0
fi

APP_ROOT="$SRCROOT/.."
DOTA_DIR="$APP_ROOT/.dota"
CODEPUSH_DIR="$DOTA_DIR/ios"

# Create .dota and ios directories if they don't exist
echo "Dota - Creating directory structure at $CODEPUSH_DIR"
mkdir -p "$CODEPUSH_DIR"

echo "Dota - Copying bundle to CodePush directory"
cp "$BUNDLE_FILE" "$CODEPUSH_DIR/$BUNDLE_NAME.jsbundle"

if [[ -d "$DEST/assets" ]]; then
    echo "Dota - Copying assets to CodePush directory"
    cp -R "$DEST/assets" "$CODEPUSH_DIR/"
fi
SCRIPT

# Save the project
begin
  project.save
  puts "Dota - Project saved successfully."
rescue => e
  puts "Dota - Error saving project: #{e.message}"
  exit 1
end