export type SplBeam = {
  version: "0.1.0";
  name: "spl_beam";
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
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "input";
          type: {
            defined: "State";
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
            defined: "State";
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
          name: "stakePool";
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
          name: "poolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolTokensVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "stakePoolWithdrawAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "reserveStakeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "managerFeeAccount";
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
          name: "beamProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "splStakePoolProgram";
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
      name: "depositStake";
      accounts: [
        {
          name: "state";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakePool";
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
          name: "poolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolTokensVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "validatorList";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakePoolDepositAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "stakePoolWithdrawAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "reserveStakeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "validatorStakeAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "managerFeeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "sysvarStakeHistory";
          isMut: false;
          isSigner: false;
        },
        {
          name: "sysvarClock";
          isMut: false;
          isSigner: false;
        },
        {
          name: "nativeStakeProgram";
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
          name: "beamProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "splStakePoolProgram";
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
      args: [];
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
          name: "stakePool";
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
          name: "poolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolTokensVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "stakePoolWithdrawAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "reserveStakeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "managerFeeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "sysvarStakeHistory";
          isMut: false;
          isSigner: false;
        },
        {
          name: "sysvarClock";
          isMut: false;
          isSigner: false;
        },
        {
          name: "nativeStakeProgram";
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
          name: "splStakePoolProgram";
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
      name: "withdrawStake";
      accounts: [
        {
          name: "state";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakePool";
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
          name: "newStakeAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "poolMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolTokensVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vaultAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "stakePoolWithdrawAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "validatorStakeList";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakeAccountToSplit";
          isMut: true;
          isSigner: false;
        },
        {
          name: "managerFeeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "sysvarStakeHistory";
          isMut: false;
          isSigner: false;
        },
        {
          name: "sysvarClock";
          isMut: false;
          isSigner: false;
        },
        {
          name: "nativeStakeProgram";
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
          name: "splStakePoolProgram";
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
      accounts: [];
      args: [];
    },
    {
      name: "redeemTicket";
      accounts: [];
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
            name: "stakePool";
            docs: ["The state account of the spl pool."];
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
              "that holds pool tokens."
            ];
            type: "u8";
          },
          {
            name: "treasury";
            docs: ["This state's SOL vault."];
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
    },
    {
      code: 6002;
      name: "Unimplemented";
      msg: "This feature is unimplemented for this beam";
    }
  ];
};

export const IDL: SplBeam = {
  version: "0.1.0",
  name: "spl_beam",
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
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "input",
          type: {
            defined: "State",
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
            defined: "State",
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
          name: "stakePool",
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
          name: "poolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolTokensVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "stakePoolWithdrawAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "reserveStakeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "managerFeeAccount",
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
          name: "beamProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "splStakePoolProgram",
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
      name: "depositStake",
      accounts: [
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakePool",
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
          name: "poolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolTokensVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "validatorList",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakePoolDepositAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "stakePoolWithdrawAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "reserveStakeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "validatorStakeAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "managerFeeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "sysvarStakeHistory",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarClock",
          isMut: false,
          isSigner: false,
        },
        {
          name: "nativeStakeProgram",
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
          name: "beamProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "splStakePoolProgram",
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
      args: [],
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
          name: "stakePool",
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
          name: "poolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolTokensVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "stakePoolWithdrawAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "reserveStakeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "managerFeeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "sysvarStakeHistory",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarClock",
          isMut: false,
          isSigner: false,
        },
        {
          name: "nativeStakeProgram",
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
          name: "splStakePoolProgram",
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
      name: "withdrawStake",
      accounts: [
        {
          name: "state",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakePool",
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
          name: "newStakeAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "poolMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolTokensVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "stakePoolWithdrawAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "validatorStakeList",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakeAccountToSplit",
          isMut: true,
          isSigner: false,
        },
        {
          name: "managerFeeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "sysvarStakeHistory",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarClock",
          isMut: false,
          isSigner: false,
        },
        {
          name: "nativeStakeProgram",
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
          name: "splStakePoolProgram",
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
            name: "stakePool",
            docs: ["The state account of the spl pool."],
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
              "that holds pool tokens.",
            ],
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
    {
      code: 6002,
      name: "Unimplemented",
      msg: "This feature is unimplemented for this beam",
    },
  ],
};
