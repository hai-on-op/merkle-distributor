# Create a distribution


```
npm i -d

# Create the Merkle root & paths 
npm run generate-merkle-root -- --input input.csv --network <kovan|mainnet> --description 'Short distribution description'

# Verify that the merkle path are correct and match the root
npm run verify-merkle-roots
```

`input.csv` should be a CSV file with the addresses and amounts to be airdropped, see `scripts/example_input.csv`. The amount is a float with 18 decimal (not a wad).

The result are exported in `scripts/merkle-paths-output/`

## Deploy the distributor and send the tokens with geb-console
```
🗿 > tx = geb.contracts.merkleDistributorFactory.deployDistributor("<MERKLE ROOT GENERATED ABOVE>", BigNumber.from("<TOTAL TOKEN AMOUNT GENERATED ABOVE>"))
🗿 > metamask(tx)

🗿 > tx = geb.contracts.merkleDistributorFactory.sendTokensToDistributor(<ID OF THE DISTRIBUTION>)
🗿 > metamask(tx)
```

## Publish the new merkle paths

In `scripts/merkle-paths-server` you can find the code for a simple merkle path server deployed on Cloudflare Workers. Check the README in the directory to deploy the worker.

The publish the new distribution on the server:
1. Go to Go https://dash.cloudflare.com/ login
2. Go to the Workers page, go to tab KV 
3. Click on view the MERKLE_DISTRIBUTOR
4. Upload the files in `scripts/merkle-paths-output/` to their respective field.