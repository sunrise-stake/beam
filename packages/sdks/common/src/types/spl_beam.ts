export type SplBeam = {
  "version": "0.1.0",
  "name": "spl_beam",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": "StateEntry"
          }
        }
      ]
    },
    {
      "name": "update",
      "accounts": [
        {
          "name": "updateAuthority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "updateInput",
          "type": {
            "defined": "StateEntry"
          }
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "depositor",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mintGsolTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reserveStakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositStake",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeOwner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintGsolTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validatorList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePoolDepositAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reserveStakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "validatorStakeAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sysvarStakeHistory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarClock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nativeStakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "withdrawer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gsolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reserveStakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sysvarStakeHistory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarClock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nativeStakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "burn",
      "docs": [
        "Burning is withdrawing without redeeming the pool tokens. The result is a beam that is \"worth more\"",
        "than the SOL that has been staked into it, i.e. the pool tokens are more valuable than the SOL.",
        "This allows yield extraction and can be seen as a form of \"donation\"."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "burner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gsolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawStake",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "withdrawer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gsolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newStakeAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validatorStakeList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeAccountToSplit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sysvarStakeHistory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarClock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nativeStakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "orderWithdrawal",
      "accounts": [],
      "args": []
    },
    {
      "name": "redeemTicket",
      "accounts": [],
      "args": []
    },
    {
      "name": "updateEpochReport",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Required to update the core state epoch report",
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "extractYield",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "yieldAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newStakeAccount",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The uninitialized new stake account. Will be initialised by CPI to the SPL StakePool program."
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validatorStakeList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeAccountToSplit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sysvarClock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nativeStakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarStakeHistory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "state",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "docs": [
              "The update authority of the state."
            ],
            "type": "publicKey"
          },
          {
            "name": "stakePool",
            "docs": [
              "The state account of the spl pool."
            ],
            "type": "publicKey"
          },
          {
            "name": "sunriseState",
            "docs": [
              "The state of the main sunrise beam."
            ],
            "type": "publicKey"
          },
          {
            "name": "vaultAuthorityBump",
            "docs": [
              "The bump of the PDA that can authorize spending from the vault",
              "that holds pool tokens."
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "StateEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "type": "publicKey"
          },
          {
            "name": "stakePool",
            "type": "publicKey"
          },
          {
            "name": "sunriseState",
            "type": "publicKey"
          },
          {
            "name": "vaultAuthorityBump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotDelegated",
      "msg": "No delegation for stake account deposit"
    },
    {
      "code": 6001,
      "name": "CalculationFailure",
      "msg": "An error occurred during calculation"
    },
    {
      "code": 6002,
      "name": "Unimplemented",
      "msg": "This feature is unimplemented for this beam"
    },
    {
      "code": 6003,
      "name": "YieldStakeAccountNotCooledDown",
      "msg": "The yield stake account cannot yet be claimed"
    },
    {
      "code": 6004,
      "name": "InsufficientYieldToExtract",
      "msg": "The yield being extracted is insufficient to cover the rent of the stake account"
    }
  ]
};

export const IDL: SplBeam = {
  "version": "0.1.0",
  "name": "spl_beam",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": "StateEntry"
          }
        }
      ]
    },
    {
      "name": "update",
      "accounts": [
        {
          "name": "updateAuthority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "updateInput",
          "type": {
            "defined": "StateEntry"
          }
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "depositor",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mintGsolTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reserveStakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositStake",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeOwner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintGsolTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validatorList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePoolDepositAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reserveStakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "validatorStakeAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sysvarStakeHistory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarClock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nativeStakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "withdrawer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gsolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reserveStakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sysvarStakeHistory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarClock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nativeStakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "burn",
      "docs": [
        "Burning is withdrawing without redeeming the pool tokens. The result is a beam that is \"worth more\"",
        "than the SOL that has been staked into it, i.e. the pool tokens are more valuable than the SOL.",
        "This allows yield extraction and can be seen as a form of \"donation\"."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "burner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gsolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawStake",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "withdrawer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gsolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newStakeAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validatorStakeList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeAccountToSplit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sysvarStakeHistory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarClock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nativeStakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "orderWithdrawal",
      "accounts": [],
      "args": []
    },
    {
      "name": "redeemTicket",
      "accounts": [],
      "args": []
    },
    {
      "name": "updateEpochReport",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Required to update the core state epoch report",
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "extractYield",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "yieldAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newStakeAccount",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The uninitialized new stake account. Will be initialised by CPI to the SPL StakePool program."
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validatorStakeList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeAccountToSplit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sysvarClock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nativeStakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarStakeHistory",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sysvarInstructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splStakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "state",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "docs": [
              "The update authority of the state."
            ],
            "type": "publicKey"
          },
          {
            "name": "stakePool",
            "docs": [
              "The state account of the spl pool."
            ],
            "type": "publicKey"
          },
          {
            "name": "sunriseState",
            "docs": [
              "The state of the main sunrise beam."
            ],
            "type": "publicKey"
          },
          {
            "name": "vaultAuthorityBump",
            "docs": [
              "The bump of the PDA that can authorize spending from the vault",
              "that holds pool tokens."
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "StateEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "type": "publicKey"
          },
          {
            "name": "stakePool",
            "type": "publicKey"
          },
          {
            "name": "sunriseState",
            "type": "publicKey"
          },
          {
            "name": "vaultAuthorityBump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotDelegated",
      "msg": "No delegation for stake account deposit"
    },
    {
      "code": 6001,
      "name": "CalculationFailure",
      "msg": "An error occurred during calculation"
    },
    {
      "code": 6002,
      "name": "Unimplemented",
      "msg": "This feature is unimplemented for this beam"
    },
    {
      "code": 6003,
      "name": "YieldStakeAccountNotCooledDown",
      "msg": "The yield stake account cannot yet be claimed"
    },
    {
      "code": 6004,
      "name": "InsufficientYieldToExtract",
      "msg": "The yield being extracted is insufficient to cover the rent of the stake account"
    }
  ]
};
