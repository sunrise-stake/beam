export type MarinadeBeam = {
  version: "0.1.0";
  name: "marinade_beam";
  instructions: [
    {
      name: "initialize";
      accounts: [
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "state";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "msolVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolVaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "input";
          type: {
            defined: "StateEntry";
          };
        }
      ];
    },
    {
      name: "update";
      accounts: [
        {
          name: "updateAuthority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "state";
          isMut: true;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "updateInput";
          type: {
            defined: "StateEntry";
          };
        }
      ];
    },
    {
      name: "deposit";
      accounts: [
        {
          name: "state";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marinadeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "sunriseState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "depositor";
          isMut: true;
          isSigner: true;
        },
        {
          name: "mintGsolTo";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gsolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gsolMintAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "instructionsSysvar";
          isMut: false;
          isSigner: false;
        },
        {
          name: "liqPoolSolLegPda";
          isMut: true;
          isSigner: false;
        },
        {
          name: "liqPoolMsolLegAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "liqPoolMsolLeg";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolMintAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "reservePda";
          isMut: true;
          isSigner: false;
        },
        {
          name: "beamProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marinadeProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        }
      ];
    },
    {
      name: "depositStakeAccount";
      accounts: [
        {
          name: "state";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marinadeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "sunriseState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakeOwner";
          isMut: true;
          isSigner: true;
        },
        {
          name: "stakeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintGsolTo";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gsolMint";
          isMut: true;
          isSigner: false;
          docs: ["Verified in CPI to Sunrise program."];
        },
        {
          name: "gsolMintAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "instructionsSysvar";
          isMut: false;
          isSigner: false;
        },
        {
          name: "validatorList";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakeList";
          isMut: true;
          isSigner: false;
        },
        {
          name: "duplicationFlag";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolMintAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "stakeProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "beamProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marinadeProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "clock";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "validatorIndex";
          type: "u32";
        }
      ];
    },
    {
      name: "withdraw";
      accounts: [
        {
          name: "state";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marinadeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "sunriseState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "withdrawer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "gsolTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gsolMint";
          isMut: true;
          isSigner: false;
          docs: ["Verified in CPI to Sunrise program."];
        },
        {
          name: "msolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "liqPoolSolLegPda";
          isMut: true;
          isSigner: false;
        },
        {
          name: "liqPoolMsolLeg";
          isMut: true;
          isSigner: false;
        },
        {
          name: "treasuryMsolAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "instructionsSysvar";
          isMut: false;
          isSigner: false;
        },
        {
          name: "beamProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marinadeProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        }
      ];
    },
    {
      name: "orderWithdrawal";
      accounts: [
        {
          name: "state";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marinadeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "sunriseState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "withdrawer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "gsolTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gsolMint";
          isMut: true;
          isSigner: false;
          docs: ["Verified in CPI to Sunrise program."];
        },
        {
          name: "msolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "msolVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "instructionsSysvar";
          isMut: false;
          isSigner: false;
        },
        {
          name: "newTicketAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "proxyTicketAccount";
          isMut: true;
          isSigner: true;
        },
        {
          name: "beamProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marinadeProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "clock";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        }
      ];
    },
    {
      name: "redeemTicket";
      accounts: [
        {
          name: "state";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marinadeState";
          isMut: true;
          isSigner: false;
        },
        {
          name: "beneficiary";
          isMut: false;
          isSigner: true;
        },
        {
          name: "sunriseTicketAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marinadeTicketAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "reservePda";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marinadeProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "clock";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "state";
      type: {
        kind: "struct";
        fields: [
          {
            name: "updateAuthority";
            docs: ["The update authority of the state."];
            type: "publicKey";
          },
          {
            name: "marinadeState";
            docs: ["The marinade state account."];
            type: "publicKey";
          },
          {
            name: "sunriseState";
            docs: ["The state of the main sunrise beam."];
            type: "publicKey";
          },
          {
            name: "vaultAuthorityBump";
            docs: ["that holds pool tokens(msol in this case)."];
            type: "u8";
          },
          {
            name: "treasury";
            docs: ["This state's SOL vault."];
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "proxyTicketAccount";
      docs: ["Maps a Marinade ticket account to a GSOL token holder"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "stateAddress";
            type: "publicKey";
          },
          {
            name: "marinadeTicketAccount";
            type: "publicKey";
          },
          {
            name: "beneficiary";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "StateEntry";
      type: {
        kind: "struct";
        fields: [
          {
            name: "updateAuthority";
            type: "publicKey";
          },
          {
            name: "marinadeState";
            type: "publicKey";
          },
          {
            name: "sunriseState";
            type: "publicKey";
          },
          {
            name: "vaultAuthorityBump";
            type: "u8";
          },
          {
            name: "treasury";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "NotDelegated";
      msg: "No delegation for stake account deposit";
    },
    {
      code: 6001;
      name: "CalculationFailure";
      msg: "An error occurred during calculation";
    }
  ];
};

export const IDL: MarinadeBeam = {
  version: "0.1.0",
  name: "marinade_beam",
  instructions: [
    {
      name: "initialize",
      accounts: [
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "msolVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolVaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "input",
          type: {
            defined: "StateEntry",
          },
        },
      ],
    },
    {
      name: "update",
      accounts: [
        {
          name: "updateAuthority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "updateInput",
          type: {
            defined: "StateEntry",
          },
        },
      ],
    },
    {
      name: "deposit",
      accounts: [
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marinadeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "sunriseState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "depositor",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mintGsolTo",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gsolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gsolMintAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "instructionsSysvar",
          isMut: false,
          isSigner: false,
        },
        {
          name: "liqPoolSolLegPda",
          isMut: true,
          isSigner: false,
        },
        {
          name: "liqPoolMsolLegAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "liqPoolMsolLeg",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolMintAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "reservePda",
          isMut: true,
          isSigner: false,
        },
        {
          name: "beamProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marinadeProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "lamports",
          type: "u64",
        },
      ],
    },
    {
      name: "depositStakeAccount",
      accounts: [
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marinadeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "sunriseState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakeOwner",
          isMut: true,
          isSigner: true,
        },
        {
          name: "stakeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintGsolTo",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gsolMint",
          isMut: true,
          isSigner: false,
          docs: ["Verified in CPI to Sunrise program."],
        },
        {
          name: "gsolMintAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "instructionsSysvar",
          isMut: false,
          isSigner: false,
        },
        {
          name: "validatorList",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakeList",
          isMut: true,
          isSigner: false,
        },
        {
          name: "duplicationFlag",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolMintAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "stakeProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "beamProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marinadeProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "clock",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "validatorIndex",
          type: "u32",
        },
      ],
    },
    {
      name: "withdraw",
      accounts: [
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marinadeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "sunriseState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "withdrawer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "gsolTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gsolMint",
          isMut: true,
          isSigner: false,
          docs: ["Verified in CPI to Sunrise program."],
        },
        {
          name: "msolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "liqPoolSolLegPda",
          isMut: true,
          isSigner: false,
        },
        {
          name: "liqPoolMsolLeg",
          isMut: true,
          isSigner: false,
        },
        {
          name: "treasuryMsolAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "instructionsSysvar",
          isMut: false,
          isSigner: false,
        },
        {
          name: "beamProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marinadeProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "lamports",
          type: "u64",
        },
      ],
    },
    {
      name: "orderWithdrawal",
      accounts: [
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marinadeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "sunriseState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "withdrawer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "gsolTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gsolMint",
          isMut: true,
          isSigner: false,
          docs: ["Verified in CPI to Sunrise program."],
        },
        {
          name: "msolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "msolVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "instructionsSysvar",
          isMut: false,
          isSigner: false,
        },
        {
          name: "newTicketAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "proxyTicketAccount",
          isMut: true,
          isSigner: true,
        },
        {
          name: "beamProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marinadeProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "clock",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "lamports",
          type: "u64",
        },
      ],
    },
    {
      name: "redeemTicket",
      accounts: [
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marinadeState",
          isMut: true,
          isSigner: false,
        },
        {
          name: "beneficiary",
          isMut: false,
          isSigner: true,
        },
        {
          name: "sunriseTicketAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marinadeTicketAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "reservePda",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marinadeProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "clock",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "state",
      type: {
        kind: "struct",
        fields: [
          {
            name: "updateAuthority",
            docs: ["The update authority of the state."],
            type: "publicKey",
          },
          {
            name: "marinadeState",
            docs: ["The marinade state account."],
            type: "publicKey",
          },
          {
            name: "sunriseState",
            docs: ["The state of the main sunrise beam."],
            type: "publicKey",
          },
          {
            name: "vaultAuthorityBump",
            docs: ["that holds pool tokens(msol in this case)."],
            type: "u8",
          },
          {
            name: "treasury",
            docs: ["This state's SOL vault."],
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "proxyTicketAccount",
      docs: ["Maps a Marinade ticket account to a GSOL token holder"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "stateAddress",
            type: "publicKey",
          },
          {
            name: "marinadeTicketAccount",
            type: "publicKey",
          },
          {
            name: "beneficiary",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "StateEntry",
      type: {
        kind: "struct",
        fields: [
          {
            name: "updateAuthority",
            type: "publicKey",
          },
          {
            name: "marinadeState",
            type: "publicKey",
          },
          {
            name: "sunriseState",
            type: "publicKey",
          },
          {
            name: "vaultAuthorityBump",
            type: "u8",
          },
          {
            name: "treasury",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "NotDelegated",
      msg: "No delegation for stake account deposit",
    },
    {
      code: 6001,
      name: "CalculationFailure",
      msg: "An error occurred during calculation",
    },
  ],
};
