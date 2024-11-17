#!/bin/bash

# Kolory dla lepszej czytelności
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking Python version...${NC}"
PYTHON_VERSION=$(python3 -V 2>&1 | awk '{print $2}')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

# Sprawdzenie minimalnej wersji Pythona (3.8)
if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo -e "${RED}Error: This project requires Python 3.8 or higher${NC}"
    echo -e "${RED}Current version: $PYTHON_VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}Python version $PYTHON_VERSION is compatible${NC}"

# Sprawdzenie systemu operacyjnego
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
elif type lsb_release >/dev/null 2>&1; then
    OS=$(lsb_release -si)
    VER=$(lsb_release -sr)
else
    OS=$(uname -s)
    VER=$(uname -r)
fi

echo -e "${GREEN}Detected OS: $OS${NC}"

# Instalacja zależności dla różnych systemów
install_ubuntu_debian() {
    echo -e "${YELLOW}Installing dependencies for Ubuntu/Debian...${NC}"
    sudo apt-get update
    sudo apt-get install -y \
        python3-dev \
        python3-pip \
        python3-venv \
        build-essential \
        gcc \
        g++ \
        libc6-dev \
        libffi-dev \
        libssl-dev \
        zlib1g-dev \
        liblzma-dev \
        libbz2-dev \
        libreadline-dev \
        libsqlite3-dev \
        libopencv-dev \
        tk-dev
}

install_fedora() {
    echo -e "${YELLOW}Installing dependencies for Fedora...${NC}"
    sudo dnf install -y \
        python3-devel \
        python3-pip \
        gcc \
        gcc-c++ \
        libffi-devel \
        openssl-devel \
        zlib-devel \
        xz-devel \
        bzip2-devel \
        readline-devel \
        sqlite-devel \
        opencv-devel \
        tk-devel
}

install_arch() {
    echo -e "${YELLOW}Installing dependencies for Arch Linux...${NC}"
    sudo pacman -Sy --noconfirm \
        python-pip \
        base-devel \
        gcc \
        make \
        libffi \
        openssl \
        zlib \
        xz \
        bzip2 \
        readline \
        sqlite \
        opencv \
        tk
}

install_macos() {
    echo -e "${YELLOW}Installing dependencies for macOS...${NC}"
    if ! command -v brew >/dev/null 2>&1; then
        echo -e "${RED}Homebrew not found. Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    brew install \
        python@3.8 \
        gcc \
        libffi \
        openssl \
        zlib \
        xz \
        bzip2 \
        readline \
        sqlite \
        opencv \
        tcl-tk
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

echo -e "${YELLOW}Creating virtual environment...${NC}"
python3 -m venv venv

echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

echo -e "${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip setuptools wheel

echo -e "${YELLOW}Installing Python packages...${NC}"
pip install -r requirements.txt

echo -e "${GREEN}Installation completed!${NC}"

# Weryfikacja instalacji
echo -e "${YELLOW}Verifying installation...${NC}"
python3 -c "import numpy; import matplotlib; import pandas; print('Basic packages verified successfully!')"

# Wyświetl informacje o zainstalowanych pakietach
echo -e "${YELLOW}Installed packages:${NC}"
pip list
