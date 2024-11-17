#!/bin/bash

# Kolory dla lepszej czytelności
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking Python version...${NC}"
PYTHON_VERSION=$(python3 -V 2>&1 | awk '{print $2}')
echo -e "${GREEN}Using Python $PYTHON_VERSION${NC}"

# Sprawdzenie systemu operacyjnego
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    OS=$(uname -s)
    VER=$(uname -r)
fi

echo -e "${GREEN}Detected OS: $OS${NC}"

# Instalacja podstawowych zależności systemowych
install_ubuntu_debian() {
    echo -e "${YELLOW}Installing dependencies for Ubuntu/Debian...${NC}"
    sudo apt-get update
    sudo apt-get install -y \
        python3-dev \
        python3-pip \
        python3-venv \
        build-essential \
        gcc
}

install_fedora() {
    echo -e "${YELLOW}Installing dependencies for Fedora...${NC}"
    sudo dnf install -y \
        python3-devel \
        python3-pip \
        gcc \
        gcc-c++
}

install_arch() {
    echo -e "${YELLOW}Installing dependencies for Arch Linux...${NC}"
    sudo pacman -Sy --noconfirm \
        python-pip \
        base-devel \
        gcc
}

install_macos() {
    echo -e "${YELLOW}Installing dependencies for macOS...${NC}"
    if ! command -v brew >/dev/null 2>&1; then
        echo -e "${RED}Homebrew not found. Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    brew install \
        python \
        gcc
}

# Instalacja zależności w zależności od systemu
case "$OS" in
    "Ubuntu"*|"Debian"*)
        install_ubuntu_debian
        ;;
    "Fedora"*)
        install_fedora
        ;;
    "Arch Linux")
        install_arch
        ;;
    "Darwin"|"macOS")
        install_macos
        ;;
    *)
        echo -e "${RED}Unsupported operating system: $OS${NC}"
        exit 1
        ;;
esac

# Usunięcie starego venv jeśli istnieje
if [ -d "venv" ]; then
    echo -e "${YELLOW}Removing existing virtual environment...${NC}"
    rm -rf venv
fi

echo -e "${YELLOW}Creating virtual environment...${NC}"
python3 -m venv venv

echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

echo -e "${YELLOW}Upgrading pip, setuptools, and wheel...${NC}"
pip install --upgrade pip setuptools wheel

echo -e "${YELLOW}Installing Python packages...${NC}"
# Instalacja pakietów jeden po drugim
while IFS= read -r line || [ -n "$line" ]; do
    # Pomiń komentarze i puste linie
    if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
        continue
    fi
    echo -e "${YELLOW}Installing $line...${NC}"
    pip install "$line" || echo -e "${RED}Failed to install $line${NC}"
done < requirements.txt

echo -e "${GREEN}Basic installation completed!${NC}"

# Wyświetl informacje o zainstalowanych pakietach
echo -e "${YELLOW}Installed packages:${NC}"
pip list

echo -e "${GREEN}Setup complete! You can now activate the virtual environment using:${NC}"
echo -e "${YELLOW}source venv/bin/activate${NC}"
