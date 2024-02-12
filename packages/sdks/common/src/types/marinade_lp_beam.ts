export type MarinadeLpBeam = {
  "version": "0.1.0",
  "name": "marinade_lp_beam",
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
          "name": "liqPoolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liqPoolVault",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The token account of the liquidity pool tokens held by the beam."
          ]
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
          "name": "liqPoolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolTokenVault",
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
          "name": "sysvarInstructions",
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
          "name": "liqPoolMsolLegAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liqPoolMintAuthority",
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
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
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
      "name": "withdraw",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
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
          "name": "liqPoolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferMsolTo",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "When withdrawing from the Marinade LP, the withdrawal is part SOL, part mSOL.",
            "The SOL portion is transferred to the user (withdrawer) and the mSOL portion",
            "is transferred to the msol_token_account owned by the marinade stake pool."
          ]
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
          "name": "liqPoolMsolLegAuthority",
          "isMut": true,
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
          "name": "sysvarInstructions",
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
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "yieldAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferMsolTo",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "When withdrawing from the Marinade LP, the withdrawal is part SOL, part mSOL.",
            "The SOL portion is transferred to the user (withdrawer) and the mSOL portion",
            "is transferred to the msol_token_account owned by the marinade stake pool."
          ]
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
          "name": "liqPoolMsolLegAuthority",
          "isMut": true,
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
        }
      ],
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
          "name": "marinadeState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
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
          "name": "liqPoolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolTokenVault",
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
          "name": "liqPoolMsolLegAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
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
              "The marinade state account for this liquidity pool."
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
              "that holds pool tokens(both liq_pool and marinade stake pool)."
            ],
            "type": "u8"
          },
          {
            "name": "treasury",
            "docs": [
              "This state's SOL vault."
            ],
            "type": "publicKey"
          },
          {
            "name": "msolTokenAccount",
            "docs": [
              "The token-account that receives msol when withdrawing liquidity."
            ],
            "type": "publicKey"
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
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "msolTokenAccount",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "CalculationFailure",
      "msg": "An error occurred during calculation"
    },
    {
      "code": 6001,
      "name": "Unimplemented",
      "msg": "This feature is unimplemented for this beam"
    }
  ]
};

export const IDL: MarinadeLpBeam = {
  "version": "0.1.0",
  "name": "marinade_lp_beam",
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
          "name": "liqPoolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liqPoolVault",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The token account of the liquidity pool tokens held by the beam."
          ]
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
          "name": "liqPoolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolTokenVault",
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
          "name": "sysvarInstructions",
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
          "name": "liqPoolMsolLegAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liqPoolMintAuthority",
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
          "name": "sunriseProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "marinadeProgram",
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
      "name": "withdraw",
      "accounts": [
        {
          "name": "state",
          "isMut": false,
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
          "name": "liqPoolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferMsolTo",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "When withdrawing from the Marinade LP, the withdrawal is part SOL, part mSOL.",
            "The SOL portion is transferred to the user (withdrawer) and the mSOL portion",
            "is transferred to the msol_token_account owned by the marinade stake pool."
          ]
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
          "name": "liqPoolMsolLegAuthority",
          "isMut": true,
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
          "name": "sysvarInstructions",
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
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "yieldAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferMsolTo",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "When withdrawing from the Marinade LP, the withdrawal is part SOL, part mSOL.",
            "The SOL portion is transferred to the user (withdrawer) and the mSOL portion",
            "is transferred to the msol_token_account owned by the marinade stake pool."
          ]
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
          "name": "liqPoolMsolLegAuthority",
          "isMut": true,
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
        }
      ],
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
          "name": "marinadeState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sunriseState",
          "isMut": true,
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
          "name": "liqPoolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liqPoolTokenVault",
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
          "name": "liqPoolMsolLegAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
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
              "The marinade state account for this liquidity pool."
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
              "that holds pool tokens(both liq_pool and marinade stake pool)."
            ],
            "type": "u8"
          },
          {
            "name": "treasury",
            "docs": [
              "This state's SOL vault."
            ],
            "type": "publicKey"
          },
          {
            "name": "msolTokenAccount",
            "docs": [
              "The token-account that receives msol when withdrawing liquidity."
            ],
            "type": "publicKey"
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
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "msolTokenAccount",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "CalculationFailure",
      "msg": "An error occurred during calculation"
    },
    {
      "code": 6001,
      "name": "Unimplemented",
      "msg": "This feature is unimplemented for this beam"
    }
  ]
};
