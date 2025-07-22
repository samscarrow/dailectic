#!/bin/bash

# ==============================================================================
#
#             Team of Rivals - Dialectical Engine Workspace Setup
#
# This script automates the setup of a workspace for the "Team of Rivals"
# AI prompting methodology. It installs necessary tools and configures
# text expansion snippets to make the workflow seamless.
#
# Supported OS: macOS (with Homebrew), Linux (Debian/Ubuntu/Fedora)
#
# ==============================================================================

# --- Utility Functions ---
print_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

print_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

print_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# --- OS Detection ---
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        *)          echo "unknown" ;;
    esac
}

# --- Espanso Path Detection ---
get_espanso_config_path() {
    local os=$(detect_os)
    local config_path=""
    
    if [[ "$os" == "macos" ]]; then
        # Check for Espanso v2 path first
        if [[ -d "$HOME/Library/Application Support/espanso" ]]; then
            config_path="$HOME/Library/Application Support/espanso/match/rivals.yml"
        else
            # Fall back to v1 path
            config_path="$HOME/.config/espanso/match/rivals.yml"
        fi
    elif [[ "$os" == "linux" ]]; then
        config_path="$HOME/.config/espanso/match/rivals.yml"
    fi
    
    echo "$config_path"
}

# --- Dependency Check ---
print_info "Starting workspace setup for the Team of Rivals..."
print_info "Checking for essential dependencies..."

# Check for Git
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install it first."
    exit 1
fi

# Check for a text editor
if ! command -v vim &> /dev/null && ! command -v nano &> /dev/null; then
    print_warning "Could not find vim or nano. A command-line text editor is recommended."
fi

print_success "Essential dependencies are present."

# --- Espanso (Text Expander) Setup ---
print_info "Checking for the text expansion tool 'espanso'..."

install_espanso() {
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            print_info "Installing Espanso via Homebrew..."
            brew install espanso
            return $?
        else
            print_error "Homebrew is not installed. Please install Homebrew first: https://brew.sh"
            return 1
        fi
    elif [[ "$os" == "linux" ]]; then
        if command -v snap &> /dev/null; then
            print_info "Installing Espanso via Snap..."
            sudo snap install espanso --classic
            return $?
        else
            print_warning "Snap is not available. Please download from: https://espanso.org/install"
            return 1
        fi
    fi
}

if ! command -v espanso &> /dev/null; then
    print_warning "Espanso is not installed."
    read -p "Would you like to install it automatically? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if install_espanso; then
            print_success "Espanso installed successfully."
        else
            print_error "Failed to install Espanso. Please install manually and re-run this script."
            exit 1
        fi
    else
        print_error "Espanso is required. Please install it manually and re-run this script."
        exit 1
    fi
else
    print_success "Espanso is already installed."
fi

# Check Espanso service status
check_espanso_status() {
    if command -v espanso &> /dev/null; then
        if espanso status &> /dev/null; then
            return 0
        else
            return 1
        fi
    fi
    return 1
}

# --- Directory and Prompt Setup ---
# Use current project directory instead of creating a new one
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT_DIR="$PROJECT_DIR/prompts"
ESPANSO_CONFIG_PATH=$(get_espanso_config_path)

print_info "Using project directory at $PROJECT_DIR..."
mkdir -p "$PROMPT_DIR"
print_success "Directory structure verified."

# Backup existing configuration if it exists
if [[ -f "$ESPANSO_CONFIG_PATH" ]]; then
    BACKUP_PATH="${ESPANSO_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    print_warning "Existing Espanso configuration found."
    print_info "Creating backup at: $BACKUP_PATH"
    cp "$ESPANSO_CONFIG_PATH" "$BACKUP_PATH"
    print_success "Backup created successfully."
fi

print_info "Creating espanso configuration at $ESPANSO_CONFIG_PATH..."

# Create the espanso config directory if it doesn't exist
mkdir -p "$(dirname "$ESPANSO_CONFIG_PATH")"

# Create the YAML configuration file for the snippets
# Using a HEREDOC to write the YAML content.
cat > "$ESPANSO_CONFIG_PATH" << 'EOF'
# ==============================================================================
#
#                    TEAM OF RIVALS - ESPANSO SNIPPETS
#
# These snippets are designed for the Dialectical Engine workflow.
#
# - :tor         -> The full master prompt for the Team of Rivals simulation.
# - :helios      -> A targeted query for the Pragmatist persona.
# - :selene      -> A targeted query for the Architect persona.
# - :prometheus  -> A targeted query for the Innovator persona.
# - :cassandra   -> A targeted query for the Risk Analyst persona.
# - :gaia        -> A targeted query for the User Advocate persona.
# - :synthesizer -> A targeted query for the Synthesizer role.
#
# ==============================================================================

matches:
  # Master "Team of Rivals" Prompt
  - trigger: ":tor"
    replace: |
      ### TEAM OF RIVALS SIMULATION ###

      **Objective:** To analyze a problem from multiple conflicting viewpoints and produce a robust, synthesized solution.

      **My Role:** I am the **Moderator**. I will present the **Thesis** (the initial problem or code).

      **Your Role:** You are the **Team of Rivals**. You must respond by embodying ALL of the following personas. For each persona, provide a concise critique or alternative based on their core philosophy. **Do not agree with each other.** The goal is constructive conflict.

      **The Rivals:**
      1.  **Helios (Pragmatist):** Provide the simplest, most direct solution using standard tools.
      2.  **Selene (Architect):** Critique the simple solution for its lack of foresight. Propose a more robust, well-structured alternative.
      3.  **Prometheus (Innovator):** Question the entire approach. Suggest a novel technology or paradigm that could be a game-changer.
      4.  **Cassandra (Risk Analyst):** Poke holes in all proposed solutions. Ask critical questions about edge cases, security, and failure modes.
      5.  **Gaia (User Advocate):** Evaluate all proposals based on their clarity, ease of use (for end-users or developers), and documentation.

      **Workflow:**
      1.  I provide the **Thesis**.
      2.  You provide the **Antithesis** by generating a response for EACH of the 5 rivals.
      3.  In a subsequent prompt, I will ask you to act as a **Synthesizer** to combine the best ideas into a final, superior solution.

      ---
      **CURRENT TASK (THESIS):**

  # Snippet for Helios (The Pragmatist)
  - trigger: ":helios"
    replace: "Acting as Helios, the Pragmatic Engineer, what is the simplest, most direct solution to the following problem using standard, battle-tested tools?"

  # Snippet for Selene (The Architect)
  - trigger: ":selene"
    replace: "Acting as Selene, the Principled Architect, critique the following solution. Focus on its lack of foresight, scalability, and maintainability. Propose a more robust, well-structured alternative based on solid design patterns."

  # Snippet for Prometheus (The Innovator)
  - trigger: ":prometheus"
    replace: "Acting as Prometheus, the Creative Innovator, challenge the assumptions behind the following approach. Suggest a novel technology, a cutting-edge paradigm, or a first-principles solution that could be a game-changer."

  # Snippet for Cassandra (The Risk Analyst)
  - trigger: ":cassandra"
    replace: "Acting as Cassandra, the Security & Risk Analyst, poke holes in the following proposal. What could possibly go wrong? Ask critical questions about edge cases, vulnerabilities, failure modes, and security risks."

  # Snippet for Gaia (The User Advocate)
  - trigger: ":gaia"
    replace: "Acting as Gaia, the User Advocate, evaluate the following proposal from the perspective of an end-user or a developer who has to maintain this. Focus on clarity, intuitive design, error messages, and documentation."

  # Snippet for the Synthesizer
  - trigger: ":synthesizer"
    replace: "Excellent. Now, acting as a **Synthesizer**, combine the best insights from all the previous rivals into a single, superior solution."
EOF

print_success "Espanso configuration for Team of Rivals has been created."

# --- Espanso Service Management ---
if ! check_espanso_status; then
    print_warning "Espanso service is not running."
    read -p "Would you like to start Espanso now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starting Espanso service..."
        if espanso start &> /dev/null; then
            print_success "Espanso service started successfully."
        else
            print_warning "Could not start Espanso automatically. Please run 'espanso start' manually."
        fi
    fi
else
    print_success "Espanso service is running."
fi

# Reload Espanso configuration
print_info "Reloading Espanso configuration..."
if command -v espanso &> /dev/null && check_espanso_status; then
    espanso restart &> /dev/null && print_success "Espanso configuration reloaded."
fi

# --- Final Instructions ---
print_info "\n--- SETUP COMPLETE ---"
print_success "Your 'Team of Rivals' workspace is ready!"
print_info "\nProject directory: $PROJECT_DIR"
print_info "Espanso config: $ESPANSO_CONFIG_PATH"
if [[ -n "$BACKUP_PATH" ]]; then
    print_info "Config backup: $BACKUP_PATH"
fi
print_info "\nNext Steps:"
print_info "1. If Espanso is not running, start it with: espanso start"
print_info "2. Open any text editor or your AI chat interface"
print_info "3. Type one of the following snippets and press space/tab:"
print_info "   - \033[32m:tor\033[0m         - Full 'Team of Rivals' master prompt"
print_info "   - \033[32m:helios\033[0m      - Pragmatist perspective"
print_info "   - \033[32m:selene\033[0m      - Architect perspective"
print_info "   - \033[32m:prometheus\033[0m  - Innovator perspective"
print_info "   - \033[32m:cassandra\033[0m   - Risk analysis perspective"
print_info "   - \033[32m:gaia\033[0m        - User advocate perspective"
print_info "   - \033[32m:synthesizer\033[0m - Synthesis step"
print_info "\nHappy engineering with dialectical thinking!"


