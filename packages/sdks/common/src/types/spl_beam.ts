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
          "isMut": true,
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
          "name": "instructionsSysvar",
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
          "isMut": true,
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
          "name": "instructionsSysvar",
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
          "isMut": true,
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
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "beamProgram",
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
      "name": "withdrawStake",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
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
          "name": "instructionsSysvar",
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
      "name": "extractYield",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": false,
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
          "isMut": false,
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
          },
          {
            "name": "partialGsolSupply",
            "docs": [
              "The amount of the current gsol supply this beam is responsible for.",
              "This field is also tracked in the matching beam-details struct in the",
              "sunrise program's state and is expected to match that value."
            ],
            "type": "u64"
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
          "isMut": true,
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
          "name": "instructionsSysvar",
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
          "isMut": true,
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
          "name": "instructionsSysvar",
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
          "isMut": true,
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
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "beamProgram",
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
      "name": "withdrawStake",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
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
          "name": "instructionsSysvar",
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
      "name": "extractYield",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": false,
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
          "isMut": false,
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
          },
          {
            "name": "partialGsolSupply",
            "docs": [
              "The amount of the current gsol supply this beam is responsible for.",
              "This field is also tracked in the matching beam-details struct in the",
              "sunrise program's state and is expected to match that value."
            ],
            "type": "u64"
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
    }
  ]
};
