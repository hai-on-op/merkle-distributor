import fs from 'fs';
import { BigNumber, utils } from 'ethers';
import { MerkleDistributorInfo } from './lib/parse-balance-map';
import { program } from 'commander';

const combinedHash = (first: Buffer, second: Buffer): Buffer => {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }

  return Buffer.from(
    utils
      .solidityKeccak256(
        ['bytes32', 'bytes32'],
        [first, second].sort(Buffer.compare)
      )
      .slice(2),
    'hex'
  );
};

const toNode = (
  index: number | BigNumber,
  account: string,
  amount: BigNumber
): Buffer => {
  const pairHex = utils.solidityKeccak256(
    ['uint256', 'address', 'uint256'],
    [index, account, amount]
  );
  return Buffer.from(pairHex.slice(2), 'hex');
};

const verifyProof = (
  index: number | BigNumber,
  account: string,
  amount: BigNumber,
  proof: Buffer[],
  root: Buffer
): boolean => {
  let pair = toNode(index, account, amount);
  for (const item of proof) {
    pair = combinedHash(pair, item);
  }

  return pair.equals(root);
};

const getNextLayer = (elements: Buffer[]): Buffer[] => {
  return elements.reduce<Buffer[]>((layer, el, idx, arr) => {
    if (idx % 2 === 0) {
      // Hash the current element with its pair element
      layer.push(combinedHash(el, arr[idx + 1]));
    }

    return layer;
  }, []);
};

const getRoot = (
  balances: { account: string; amount: BigNumber; index: number }[]
): Buffer => {
  let nodes = balances
    .map(({ account, amount, index }) => toNode(index, account, amount))
    // sort by lexicographical order
    .sort(Buffer.compare);

  // deduplicate any eleents
  nodes = nodes.filter((el, idx) => {
    return idx === 0 || !nodes[idx - 1].equals(el);
  });

  const layers = [];
  layers.push(nodes);

  // Get next layer until we reach the root
  while (layers[layers.length - 1].length > 1) {
    layers.push(getNextLayer(layers[layers.length - 1]));
  }

  return layers[layers.length - 1][0];
};

const verifyDistribution = (json: MerkleDistributorInfo) => {
  const recipientCont = Object.keys(json.recipients).length;
  if (recipientCont === 0) return;

  console.log(`Check distribution with ${recipientCont} recipients`);

  const merkleRootHex = json.merkleRoot;
  const merkleRoot = Buffer.from(merkleRootHex.slice(2), 'hex');

  let balances: { index: number; account: string; amount: BigNumber }[] = [];
  let valid = true;

  Object.keys(json.recipients).forEach(address => {
    const recipient = json.recipients[address];
    const proof = recipient.proof.map((p: string) =>
      Buffer.from(p.slice(2), 'hex')
    );
    balances.push({
      index: recipient.index,
      account: address,
      amount: BigNumber.from(recipient.amount)
    });
    if (
      verifyProof(
        recipient.index,
        address,
        BigNumber.from(recipient.amount),
        proof,
        merkleRoot
      )
    ) {
      // console.log('Verified proof for', recipient.index, address)
    } else {
      console.log('Verification for', address, 'failed');
      valid = false;
    }
  });

  if (!valid) {
    console.error('  Failed validation for 1 or more proofs');
    process.exit(1);
  }
  console.log('  Done!');

  // Root
  const root = getRoot(balances).toString('hex');
  console.log('Reconstructed merkle root', root);
  console.log(
    'Root matches the one read from the JSON?',
    root === merkleRootHex.slice(2)
  );
};

program
  .version('0.0.0')
  .requiredOption('-t, --token <kite|op>', "token the distribution is for'")
  .requiredOption(
    '-n, --network <optimism|optimism-sepolia>',
    'Network to publish the distribution'
  )
  .requiredOption('-i, --id <number>', 'Distribution id on the contract');

program.parse(process.argv);

const getJson = (path: string): MerkleDistributorInfo[] =>
  JSON.parse(fs.readFileSync(path, 'utf-8'));

let data: MerkleDistributorInfo[] = getJson(
  `scripts/merkle-paths-output/${program.opts().network}/${
    program.opts().token
  }.json`
);

for (let i in data) {
  console.log(
    `[CONTRACT INDEX ${Number(i) + 1}] Distro: ${
      data[i].description
    } | Root 0x${data[i].merkleRoot}`
  );
}

console.log(`\n===============\n`);

const distroContractId = program.opts().id;
const distroArrayId = program.opts().id - 1;
const dist = data[distroArrayId];

if (!dist) {
  console.log(`Distro ${distroContractId} doesn't exist`);
} else if (dist.merkleRoot === '') {
  console.log(`Distro ${distroContractId} is empty`);
} else {
  console.log(
    `Verifying distro ${distroContractId} out of ${data.length} on ${
      program.opts().network
    }`
  );
  console.log(`Description: ${dist.description}`);
  console.log(
    `Amount: ${
      Number(BigNumber.from(dist.tokenTotal).toString()) / 1e18
    } | ${BigNumber.from(dist.tokenTotal).toString()} | ${BigNumber.from(
      dist.tokenTotal
    ).toHexString()}`
  );

  verifyDistribution(dist);
}
