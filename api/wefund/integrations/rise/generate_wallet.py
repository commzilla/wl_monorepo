from eth_account import Account

# Generate a new Ethereum wallet
acct = Account.create()

print("Wallet address:", acct.address)
print("Private key (keep secret!):", acct.key.hex())