import { ethers } from 'ethers';

export class CustomProvider extends ethers.JsonRpcProvider {
  constructor(url: string) {
    super(url);
  }
}
