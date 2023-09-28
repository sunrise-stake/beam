export type MarinadeLpBeam = {
  version: "0.1.0";
  name: "marinade_lp_beam";
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
          name: "liqPoolMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "liqPoolVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
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
        },
      ];
      args: [
        {
          name: "input";
          type: {
            defined: "StateEntry";
          };
        },
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
        },
      ];
      args: [
        {
          name: "updateInput";
          type: {
            defined: "StateEntry";
          };
        },
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
          name: "liqPoolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "liqPoolTokenVault";
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
          name: "liqPoolMsolLegAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "liqPoolMintAuthority";
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
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        },
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
          name: "liqPoolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "liqPoolTokenVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "transferMsolTo";
          isMut: true;
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
          name: "liqPoolMsolLegAuthority";
          isMut: true;
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
        },
        {
          name: "gsolMint";
          isMut: true;
          isSigner: false;
          docs: ["Verified in CPI to Sunrise program."];
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
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        },
      ];
    },
    {
      name: "orderWithdrawal";
      accounts: [];
      args: [];
    },
    {
      name: "redeemTicket";
      accounts: [];
      args: [];
    },
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
            docs: ["The marinade state account for this liquidity pool."];
            type: "publicKey";
          },
          {
            name: "sunriseState";
            docs: ["The state of the main sunrise beam."];
            type: "publicKey";
          },
          {
            name: "vaultAuthorityBump";
            docs: [
              "The bump of the PDA that can authorize spending from the vault",
              "that holds pool tokens(both liq_pool and marinade stake pool).",
            ];
            type: "u8";
          },
          {
            name: "treasury";
            docs: ["This state's SOL vault."];
            type: "publicKey";
          },
          {
            name: "msolTokenAccount";
            docs: [
              "The token-account that receives msol when withdrawing liquidity.",
            ];
            type: "publicKey";
          },
          {
            name: "partialGsolSupply";
            docs: [
              "The amount of the current gsol supply this beam is responsible for.",
              "This field is also tracked in the matching beam-details struct in the",
              "sunrise program's state and is expected to match that value.",
            ];
            type: "u64";
          },
        ];
      };
    },
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
          },
          {
            name: "msolTokenAccount";
            type: "publicKey";
          },
        ];
      };
    },
  ];
  errors: [
    {
      code: 6000;
      name: "CalculationFailure";
      msg: "An error occurred during calculation";
    },
    {
      code: 6001;
      name: "Unimplemented";
      msg: "This feature is unimplemented for this beam";
    },
  ];
};

export const IDL: MarinadeLpBeam = {
  version: "0.1.0",
  name: "marinade_lp_beam",
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
          name: "liqPoolMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "liqPoolVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
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
          name: "liqPoolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "liqPoolTokenVault",
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
          name: "liqPoolMsolLegAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "liqPoolMintAuthority",
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
      ],
      args: [
        {
          name: "lamports",
          type: "u64",
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
          name: "liqPoolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "liqPoolTokenVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "transferMsolTo",
          isMut: true,
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
          name: "liqPoolMsolLegAuthority",
          isMut: true,
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
        {
          name: "gsolMint",
          isMut: true,
          isSigner: false,
          docs: ["Verified in CPI to Sunrise program."],
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
      accounts: [],
      args: [],
    },
    {
      name: "redeemTicket",
      accounts: [],
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
            docs: ["The marinade state account for this liquidity pool."],
            type: "publicKey",
          },
          {
            name: "sunriseState",
            docs: ["The state of the main sunrise beam."],
            type: "publicKey",
          },
          {
            name: "vaultAuthorityBump",
            docs: [
              "The bump of the PDA that can authorize spending from the vault",
              "that holds pool tokens(both liq_pool and marinade stake pool).",
            ],
            type: "u8",
          },
          {
            name: "treasury",
            docs: ["This state's SOL vault."],
            type: "publicKey",
          },
          {
            name: "msolTokenAccount",
            docs: [
              "The token-account that receives msol when withdrawing liquidity.",
            ],
            type: "publicKey",
          },
          {
            name: "partialGsolSupply",
            docs: [
              "The amount of the current gsol supply this beam is responsible for.",
              "This field is also tracked in the matching beam-details struct in the",
              "sunrise program's state and is expected to match that value.",
            ],
            type: "u64",
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
          {
            name: "msolTokenAccount",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "CalculationFailure",
      msg: "An error occurred during calculation",
    },
    {
      code: 6001,
      name: "Unimplemented",
      msg: "This feature is unimplemented for this beam",
    },
  ],
};
