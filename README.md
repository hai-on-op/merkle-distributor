# Create a distribution

```
npm i -d

# Create the Merkle root & paths 
npm run generate-merkle-root -- --input input.csv --network <kovan|mainnet> --description 'Community Distribution #5'

# Verify that the merkle path are correct and match the root
npm run verify-merkle-roots -- --network <kovan|mainnet> --id 7
```

`input.csv` should be a CSV file with the addresses and amounts to be airdropped. See `scripts/example_input.csv` for an example. The token amount is a float with 18 decimals (not a WAD).

The results are exported in `scripts/merkle-paths-output/`

## Deploy the distributor and send tokens with geb-console
```
🗿 > tx = geb.contracts.merkleDistributorFactory.deployDistributor("<MERKLE ROOT GENERATED ABOVE>", BigNumber.from("<TOTAL TOKEN AMOUNT GENERATED ABOVE>"))
🗿 > metamask(tx)

🗿 > tx = geb.contracts.merkleDistributorFactory.sendTokensToDistributor(<ID OF THE DISTRIBUTION>)
🗿 > metamask(tx)
```
