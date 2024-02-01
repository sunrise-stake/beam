export type MarinadeBeam = {
  "version": "0.1.0",
  "name": "marinade_beam",
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
          "name": "msolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVaultAuthority",
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
          "name": "marinadeState",
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
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false
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
          "name": "liqPoolSolLegPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolMsolLegAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liqPoolMsolLeg",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reservePda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
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
      "name": "depositStakeAccount",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeState",
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
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
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
          "name": "validatorList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "duplicationFlag",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
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
          "name": "validatorIndex",
          "type": "u32"
        }
      ]
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
          "name": "marinadeState",
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
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liqPoolSolLegPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolMsolLeg",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasuryMsolAccount",
          "isMut": true,
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
          "name": "marinadeProgram",
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
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeState",
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
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newTicketAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proxyTicketAccount",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
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
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
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
          "name": "vaultAuthority",
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
      "name": "redeemTicket",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beneficiary",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "sunriseTicketAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeTicketAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "reservePda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initEpochReport",
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
          "name": "marinadeState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "epochReportAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "extractedYield",
          "type": "u64"
        }
      ]
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
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "epochReportAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
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
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "yieldAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolSolLegPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolMsolLeg",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasuryMsolAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "epochReport",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The epoch report account. This is updated with the latest extracted yield value.",
            "It must be up to date with the current epoch. If not, run updateEpochReport before it."
          ]
        },
        {
          "name": "sysvarClock",
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
          "name": "marinadeProgram",
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
            "name": "marinadeState",
            "docs": [
              "The marinade state account."
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
              "that holds pool tokens (msol in this case)."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proxyTicket",
      "docs": [
        "Maps a Marinade ticket account to a GSOL token holder"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "publicKey"
          },
          {
            "name": "marinadeTicketAccount",
            "type": "publicKey"
          },
          {
            "name": "beneficiary",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "epochReport",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "publicKey"
          },
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "tickets",
            "type": "u64"
          },
          {
            "name": "totalOrderedLamports",
            "type": "u64"
          },
          {
            "name": "extractableYield",
            "type": "u64"
          },
          {
            "name": "extractedYield",
            "type": "u64"
          },
          {
            "name": "bump",
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
            "name": "marinadeState",
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
      "name": "InvalidEpochReportAccount",
      "msg": "The epoch report account has not been updated to the current epoch yet"
    },
    {
      "code": 6003,
      "name": "RemainingUnclaimableTicketAmount",
      "msg": "The total ordered ticket amount exceeds the amount in all found tickets"
    },
    {
      "code": 6004,
      "name": "DelayedUnstakeTicketsNotYetClaimable",
      "msg": "Delayed unstake tickets for the current epoch can not yet be claimed"
    },
    {
      "code": 6005,
      "name": "TooManyTicketsClaimed",
      "msg": "The amount of delayed unstake tickets requested to be recovered exceeds the amount in the report"
    }
  ]
};

export const IDL: MarinadeBeam = {
  "version": "0.1.0",
  "name": "marinade_beam",
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
          "name": "msolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVaultAuthority",
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
          "name": "marinadeState",
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
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false
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
          "name": "liqPoolSolLegPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolMsolLegAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liqPoolMsolLeg",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reservePda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
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
      "name": "depositStakeAccount",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeState",
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
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
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
          "name": "validatorList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakeList",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "duplicationFlag",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
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
          "name": "validatorIndex",
          "type": "u32"
        }
      ]
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
          "name": "marinadeState",
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
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liqPoolSolLegPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolMsolLeg",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasuryMsolAccount",
          "isMut": true,
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
          "name": "marinadeProgram",
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
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeState",
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
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verified in CPI to Sunrise program."
          ]
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newTicketAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proxyTicketAccount",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
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
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
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
          "name": "vaultAuthority",
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
      "name": "redeemTicket",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beneficiary",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "sunriseTicketAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeTicketAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "reservePda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initEpochReport",
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
          "name": "marinadeState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "epochReportAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "extractedYield",
          "type": "u64"
        }
      ]
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
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "epochReportAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
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
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "msolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "msolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "yieldAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolSolLegPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolMsolLeg",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasuryMsolAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "epochReport",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The epoch report account. This is updated with the latest extracted yield value.",
            "It must be up to date with the current epoch. If not, run updateEpochReport before it."
          ]
        },
        {
          "name": "sysvarClock",
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
          "name": "marinadeProgram",
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
            "name": "marinadeState",
            "docs": [
              "The marinade state account."
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
              "that holds pool tokens (msol in this case)."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proxyTicket",
      "docs": [
        "Maps a Marinade ticket account to a GSOL token holder"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "publicKey"
          },
          {
            "name": "marinadeTicketAccount",
            "type": "publicKey"
          },
          {
            "name": "beneficiary",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "epochReport",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "publicKey"
          },
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "tickets",
            "type": "u64"
          },
          {
            "name": "totalOrderedLamports",
            "type": "u64"
          },
          {
            "name": "extractableYield",
            "type": "u64"
          },
          {
            "name": "extractedYield",
            "type": "u64"
          },
          {
            "name": "bump",
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
            "name": "marinadeState",
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
      "name": "InvalidEpochReportAccount",
      "msg": "The epoch report account has not been updated to the current epoch yet"
    },
    {
      "code": 6003,
      "name": "RemainingUnclaimableTicketAmount",
      "msg": "The total ordered ticket amount exceeds the amount in all found tickets"
    },
    {
      "code": 6004,
      "name": "DelayedUnstakeTicketsNotYetClaimable",
      "msg": "Delayed unstake tickets for the current epoch can not yet be claimed"
    },
    {
      "code": 6005,
      "name": "TooManyTicketsClaimed",
      "msg": "The amount of delayed unstake tickets requested to be recovered exceeds the amount in the report"
    }
  ]
};
