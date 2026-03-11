/**
 * MerkleReceipt - Builds Merkle trees over batches of decision artifacts.
 *
 * Provides tamper-evident inclusion proofs for governance decision artifacts
 * using SHA-256 hash trees. Supports incremental leaf addition, tree
 * construction, proof generation, and static proof verification.
 */

import { createHash } from 'node:crypto';

/** A constructed Merkle tree with its root hash and metadata. */
export interface MerkleTree {
  readonly root: string;
  readonly leaves: string[];
  readonly depth: number;
}

/** An inclusion proof for a specific leaf in the Merkle tree. */
export interface MerkleProof {
  readonly leaf: string;
  readonly index: number;
  readonly siblings: string[];
  readonly root: string;
}

/**
 * Compute the SHA-256 hash of the given data, returned as a hex string.
 */
function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Hash two sibling nodes together to produce their parent hash.
 * Concatenates left + right before hashing.
 */
function hashPair(left: string, right: string): string {
  return sha256(left + right);
}

/**
 * MerkleReceipt - builds Merkle trees over batches of decision artifacts.
 *
 * Usage:
 * 1. Add leaves with addLeaf()
 * 2. Build the tree with build()
 * 3. Generate inclusion proofs with getProof()
 * 4. Verify proofs with MerkleReceipt.verifyProof()
 */
export class MerkleReceipt {
  private readonly rawLeaves: string[] = [];
  private hashedLeaves: string[] = [];
  private layers: string[][] = [];
  private built = false;

  /**
   * Add a leaf to the tree. Returns the zero-based index of the leaf.
   * Leaves must be added before build() is called.
   */
  addLeaf(data: string): number {
    if (this.built) {
      throw new Error('Cannot add leaves after the tree has been built.');
    }
    const index = this.rawLeaves.length;
    this.rawLeaves.push(data);
    return index;
  }

  /**
   * Build the Merkle tree from the added leaves.
   * If the number of leaves at any level is odd, the last leaf is duplicated.
   */
  build(): MerkleTree {
    if (this.rawLeaves.length === 0) {
      throw new Error('Cannot build a Merkle tree with no leaves.');
    }

    this.hashedLeaves = this.rawLeaves.map((leaf) => sha256(leaf));
    this.layers = [this.hashedLeaves.slice()];

    let currentLayer = this.hashedLeaves.slice();

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];

      // If odd number of nodes, duplicate the last one.
      if (currentLayer.length % 2 !== 0) {
        currentLayer.push(currentLayer[currentLayer.length - 1]);
      }

      for (let i = 0; i < currentLayer.length; i += 2) {
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
      }

      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    this.built = true;

    return {
      root: currentLayer[0],
      leaves: this.hashedLeaves.slice(),
      depth: this.layers.length - 1,
    };
  }

  /**
   * Generate an inclusion proof for the leaf at the given index.
   * The tree must be built before calling this method.
   */
  getProof(index: number): MerkleProof {
    if (!this.built) {
      throw new Error('Tree must be built before generating proofs.');
    }
    if (index < 0 || index >= this.hashedLeaves.length) {
      throw new RangeError(`Leaf index ${index} out of range [0, ${this.hashedLeaves.length - 1}].`);
    }

    const siblings: string[] = [];
    let currentIndex = index;

    for (let level = 0; level < this.layers.length - 1; level++) {
      const layer = this.layers[level];

      // Pad layer if odd for proof generation (same as build).
      const paddedLayer = layer.length % 2 !== 0
        ? [...layer, layer[layer.length - 1]]
        : layer;

      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      siblings.push(paddedLayer[siblingIndex]);

      currentIndex = Math.floor(currentIndex / 2);
    }

    const root = this.layers[this.layers.length - 1][0];

    return {
      leaf: this.hashedLeaves[index],
      index,
      siblings,
      root,
    };
  }

  /**
   * Verify an inclusion proof against a given root hash.
   * This is a static method that does not require a tree instance.
   */
  static verifyProof(proof: MerkleProof, root: string): boolean {
    let currentHash = proof.leaf;
    let currentIndex = proof.index;

    for (const sibling of proof.siblings) {
      if (currentIndex % 2 === 0) {
        currentHash = hashPair(currentHash, sibling);
      } else {
        currentHash = hashPair(sibling, currentHash);
      }
      currentIndex = Math.floor(currentIndex / 2);
    }

    return currentHash === root;
  }
}
