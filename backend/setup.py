import importlib.util
import sys

def check_dependency(package_name):
    spec = importlib.util.find_spec(package_name)
    if spec is None:
        print(f"Error: {package_name} not found")
        sys.exit(1)
    print(f"{package_name} found successfully")

def setup_environment():
    # Check required packages
    check_dependency('solcx')
    check_dependency('web3')
    check_dependency('eth_account')
    
    # Install specific solc version
    import solcx
    solcx.install_solc('0.8.20')
    print("Solc 0.8.20 installed successfully")

if __name__ == "__main__":
    setup_environment()
