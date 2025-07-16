import { ethers } from 'ethers';

import { LIT_RPC } from '@lit-protocol/constants';
import { getVincentToolClient } from '@lit-protocol/vincent-app-sdk';

import { env } from '../../../env';
import { IPFS_CIDS_INDEX_BY_APP_VERSION } from '../../../ipfsCidsIndexByAppVersion';

const { VINCENT_DELEGATEE_PRIVATE_KEY } = env;

export const ethersSigner = new ethers.Wallet(
  VINCENT_DELEGATEE_PRIVATE_KEY,
  new ethers.providers.StaticJsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
);

export function getErc20ApprovalToolClient({ vincentAppVersion }: { vincentAppVersion: number }) {
  if (!(vincentAppVersion in IPFS_CIDS_INDEX_BY_APP_VERSION)) {
    throw new Error(
      `Invalid vincentAppVersion: ${vincentAppVersion}. It must be a key in IPFS_CIDS_INDEX_BY_APP_VERSION.`
    );
  }

  return getVincentToolClient({
    ethersSigner,
    vincentToolCid:
      IPFS_CIDS_INDEX_BY_APP_VERSION[
        vincentAppVersion as keyof typeof IPFS_CIDS_INDEX_BY_APP_VERSION // Checked explicitly above
      ].ERC20_APPROVAL_TOOL,
  });
}

export function getUniswapToolClient({ vincentAppVersion }: { vincentAppVersion: number }) {
  if (!(vincentAppVersion in IPFS_CIDS_INDEX_BY_APP_VERSION)) {
    throw new Error(
      `Invalid vincentAppVersion: ${vincentAppVersion}. It must be a key in IPFS_CIDS_INDEX_BY_APP_VERSION.`
    );
  }

  return getVincentToolClient({
    ethersSigner,
    vincentToolCid:
      IPFS_CIDS_INDEX_BY_APP_VERSION[
        vincentAppVersion as keyof typeof IPFS_CIDS_INDEX_BY_APP_VERSION // Checked explicitly above
      ].UNISWAP_SWAP_TOOL,
  });
}
