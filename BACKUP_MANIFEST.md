# Backup Manifest

This manifest is generated from `git ls-files -co --exclude-standard` for the portable backup. It includes every Git-tracked file in the finalized portable-backup source tree. Each row has a one-line purpose.

- Repository files listed: **964**
- No non-ignored workspace files remained when this manifest was finalized.
- Ignored runtime/cache/archive/data-export paths are intentionally not treated as repository source. Their categories and recovery requirements are documented below.
- `.git-rewrite/` (546 files of filter-branch plumbing) was removed from tracking in this update.

## Court form PDF audit

All 57 court form PDFs used by the application are committed directly to the
repository under `artifacts/api-server/assets/`. **No form PDF is fetched at
runtime from object storage, a CDN, or a government website.** The form
handlers load every PDF from the local filesystem at the path returned by
`path.join(__dirname, '../assets/...')`.

| Path |
| --- |
| `artifacts/api-server/assets/fl-forms/cl-219-volusia.pdf` |
| `artifacts/api-server/assets/fl-forms/clkct333-miami-dade.pdf` |
| `artifacts/api-server/assets/fl-forms/clkct423-miami-dade-summons.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7322-summons.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7330-auto-negligence.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7331-goods-sold.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7332-work-materials.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7333-money-lent.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7334-promissory-note.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7335-pawnbroker.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7336-replevin-govt.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-7337-account-stated.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-fee-waiver-1998.pdf` |
| `artifacts/api-server/assets/fl-forms/fl-indigent-fee-waiver.pdf` |
| `artifacts/api-server/assets/fl-forms/florida-small-claims-rules-2026.pdf` |
| `artifacts/api-server/assets/fl-forms/plain-statement-of-claim-orange.pdf` |
| `artifacts/api-server/assets/fl-forms/statement-of-claim-hillsborough.pdf` |
| `artifacts/api-server/assets/forms/az-aocdfgf1f-fee-waiver.pdf` |
| `artifacts/api-server/assets/forms/az-ljsc00001f-complaint.pdf` |
| `artifacts/api-server/assets/forms/az-ljsc00002f-summons.pdf` |
| `artifacts/api-server/assets/forms/az-ljsc00003f-proof-of-service.pdf` |
| `artifacts/api-server/assets/forms/fl-clkct423-summons.pdf` |
| `artifacts/api-server/assets/forms/fl-soc-7340.pdf` |
| `artifacts/api-server/assets/forms/fl-soc-form7340.pdf` |
| `artifacts/api-server/assets/forms/fl-summons-7322.pdf` |
| `artifacts/api-server/assets/forms/fw001_acroform.pdf` |
| `artifacts/api-server/assets/forms/il-letter-to-sheriff.pdf` |
| `artifacts/api-server/assets/forms/il-smc-complaint.pdf` |
| `artifacts/api-server/assets/forms/mc030_acroform.pdf` |
| `artifacts/api-server/assets/forms/nc-aoc-cvm-100.pdf` |
| `artifacts/api-server/assets/forms/nc-aoc-g-106.pdf` |
| `artifacts/api-server/assets/forms/nj_complaint_acroform.pdf` |
| `artifacts/api-server/assets/forms/nj_mv_complaint_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc100a_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc100_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc103_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc104_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc105_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc112a_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc120_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc140_acroform.pdf` |
| `artifacts/api-server/assets/forms/sc150_acroform.pdf` |
| `artifacts/api-server/assets/forms/tx-return-of-service.pdf` |
| `artifacts/api-server/assets/forms/tx-small-claims-petition-jp2.pdf` |
| `artifacts/api-server/assets/forms/tx-small-claims-petition-jp5.pdf` |
| `artifacts/api-server/assets/forms/tx-small-claims-petition-oca.pdf` |
| `artifacts/api-server/assets/forms/tx-small-claims-petition.pdf` |
| `artifacts/api-server/assets/forms/wa-misc-05-0200.pdf` |
| `artifacts/api-server/assets/il-forms/il-fee-waiver-civil.pdf` |
| `artifacts/api-server/assets/il-forms/il-smc-summons.pdf` |
| `artifacts/api-server/assets/nc-forms/nc-aoc-cvm-200.pdf` |
| `artifacts/api-server/assets/sc104_form.pdf` |
| `artifacts/api-server/assets/tx-forms/denton-citation-request.pdf` |
| `artifacts/api-server/assets/tx-forms/tx-rule145-statement.pdf` |
| `artifacts/api-server/assets/va-forms/dc-402.pdf` |
| `artifacts/api-server/assets/va-forms/dc-409.pdf` |
| `artifacts/api-server/assets/wa-forms/wa-misc-05-0100.pdf` |

## Repository file inventory

| Path | Purpose |
| --- | --- |
| `AI_CONFIG.md` | AI model, prompt-template, parameter, and failure-handling inventory. |
| `DATABASE.md` | Database engine, schema, migration, export, and external-data record. |
| `Dockerfile` | Portable container build for API and static web frontend targets. |
| `PORTABILITY.md` | Replit lock-in and third-party-service migration audit. |
| `RESTORE.md` | Clean-machine source, database, container, and verification restore instructions. |
| `docker-compose.yml` | Local portable stack for PostgreSQL, API, and web frontend. |
| `docker/nginx.conf` | Portable container reverse-proxy configuration. |
| `schema.sql` | Schema-only PostgreSQL export captured for this portability backup. |
| `.agents/memory/MEMORY.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/portable-backup-scope.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/acroform-autosize-font.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/az-complaint-pinal-form.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/chatgpt-prompt-return-verification.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/clerk-e2e-test-auth-blocker.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/clerk-signed-summons.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/county-directory-batch-fetch.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/deploy-libs-server-tsconfig.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/download-token-single-use.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/duplicate-state-dropdowns.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/fdf-name-escaping.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/fl-fee-waiver-coords.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/fl-forms-architecture.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/form-asset-path.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/form-engine.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/form-signature-coords.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/github-push.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/govt-pdf-download-blockers.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/heavy-validation-parallel-oom.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/help-genie-state-terminology.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/internal-research-placeholders.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/llm-classification-ceiling.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/mobile-parity-rule.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/multi-state-seo-copy.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/oca-pdf-broken-da.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/overlay-to-acroform-conversion.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/pdf-lib-embedpng-sync-hang.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/pdf-lib-winansi-glyphs.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/pdf-revision-field-drift.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/pdf-signed-size-guarantee.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/pill-toggle-clipping.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/plaintiff-only.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/prod-startup-crash.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/registered-agent-printing-pattern.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/sc100-rendering.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/sig-placement-standard.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/signature-placement-source.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/signed-form-sigcheck-tests.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/sse-marker-parse-order.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/state-facts-single-source.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/stripe-connection.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/va-court-url-patterns.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/memory/va-official-forms.md` | Durable project-memory note for future collaborators and agents. |
| `.agents/skills/agent-self-improvement/SKILL.md` | Project documentation. |
| `.agents/skills/project-health-review/SKILL.md` | Project documentation. |
| `.agents/skills/state-expansion/SKILL.md` | Project documentation. |
| `.agents/skills/ui-change-verification/SKILL.md` | Project documentation. |
| `.agents/skills/ui-layout-constraints/SKILL.md` | Project documentation. |
| `.env.example` | Portable environment-variable template with placeholder values only. |
| `.dockerignore` | Docker build-context exclusions for local dependencies, secrets, dumps, and generated output. |
| `.git-rewrite/backup-refs` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/commit` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/heads` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/index` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/004c702e6f53f329713f2d5779b0b05efb301e80` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/01c9ec9a3febf237d392ab9b5f0de37b6a557b5d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/0207f76adac0165b55ecec142bdb5f72d913a3d9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/026dca7dd063d935d1a1d605ebb413ab74ea6256` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/03292a3d9f831f2d08f45698e81a9c2d625016b5` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/04deec9a37b7481d6349d4e5d18ee1b8e13f431d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/04f51f94d457aed205872bc00d8285ac44e6ed93` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/04fda5071b6f9dfb66c4096d72c7a79bb03c6d93` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/05479ced651606bcc7c9ddc987362ab4a71cc229` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/05776ff303b6b5660191103ce0cd2feaf47938fe` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/064e605d473476fd844fb509e2a89c1b0d77eb4f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/06dffe5bb352ac8187b41c18b5b6f04329291542` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/074a1cf91dcccd215495f006b540a88375dae768` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/07d6cbfab4b1a09a6e9f8112ca92673aa2802e19` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/083e47685247b655436edd4a1d09672b411b4182` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/085118099859b2df148f38f14f23c129f65cb5ea` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/08e17b9866e31f4a560e8a5943a3ccc0e5f4a4fc` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/09581a0ceeed4c78a6f3f29d68d6ee66476b6e2f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/09b7503bf2e85fa2ddcf94786ab681a22013e206` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/0b2a36fa44f2448d2220435e37cd06e30842253e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/0cb4147ae414be04ea0d8a4cf817e45230d96a52` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/0e2d6a9b387183214de57afd44d9af60ceab379e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/0eac3af86b4c23cf2b7779e92dd3a8aec49b055a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/0ed84f6e4141061a9ceb8560bee3bc33b94fb9e2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/0f66f3129f2b02a1c4d837ee5af9b75870979c61` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/0fc2001af4422552670bf146902c910b6919148a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/105015bf7f4d5b89a95d9384d30c2f22f48a1f5a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/109da97b205ecbb54625549373f645e6fe43f593` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/117e28d702bf5c5b5c42c5f573019c58e1015407` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/11d9ebc1852c80cc985855236cd5ae042a1a3bbc` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/11ee9935b20db51c30dc347d84bf5f585e35b2c0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/12137ab3d6396d26fe02d40cec6bec44f9bfcf66` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/128465744151c2f529b2c7cc37bf7e165d79aa08` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/12adfedb76428b460a0f47a8ba4ac689c0cc05f9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/12ce4f557266c35d135cbdd88c16e03ac7c71bad` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/13e51374e4eb8c85aedcec3b83385682aad9ebfa` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/140180b55491621a10c420195f780812129ca022` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/144a6c081cde56873a919684526561eb35ab2a8e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/154539fb97bc185144cb5633ba97497168c9db81` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1588e2a65adde6dcb42095d1340e44c984d0e6b0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1619a74b87266d06943679354ef96186e748127d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/161ae0f20993c356bd6a72210c57dba406372b9f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/172fce55734f91efeac1cd5b3d29584e7b67bb50` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/187a464fbfc61a32ce5afd9ac9392b6e6728290c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/18a8c409cc0360e94d704319c83d9bec573583ab` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/192b69015bbfac396dc2915bf08c1706378cf4b4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1a2d6670618c2a52cb65c5c34d60fcd7fde45475` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1a460429fe389883ecadc7dbe9d3e6ffbdf857de` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1af85ffc893e53ef53cf632e521bfcb4e0a114ef` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1b3ce08d7003250a97dfb5b134ff765b9f1c9e6c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1b7ec87ac639e36f7f2ee5f18a9aa047fa3f0833` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1cc44469d308480488fc886407899315ff991069` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1e81e8d03163f73d7fce8db826f473d689cdeb89` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1ee278901bab1759409d4c035ee6605ddcb27c0e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/1f5317cc8048281eb950639837a57d9eab42185c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/203683dc78092f3e7da5ec0e9b5edc88565f3d0f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/20521da799a5d8062a3f344af10f5af5796ab280` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2070bf95c69e155499eb363849433a208b265ede` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/21a4b87bcaa0629631f4c075fc959cce19268871` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/227a1ea525b3b0cbee5a9371b507541329420a1b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/23d50878f37ea8aeaa45189f8e658457aa463586` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/242ed60fa7baa262dabcbcee4ac20948642b6631` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2433814bcb041a76e0bf5951531a8c9e2b6526b3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/24921e6af6c971fe834deb0619aaeca22f96cc79` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/24c489348a13bb5436f48d4ee6b415f1df621782` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/24fa65ae127ee905c09caf329b4fa0e0db3cc0cc` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/259361e94e6f0df1fd4adf17501c50797439b44f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2689318d1dc0063b14c54c7821abd7139893545d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/272d72f83928b0c00f067b929dbab2f24e74f62f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/279f31387e735e888820d28b8111939ac540f503` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/27de97d74181d305cc179e9425bdc64a647e74f5` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/28090294688c9519ed8439b331224e6e8337f7ed` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/28a8ba08c959ed4dfca2a01d526b85e351574a81` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/28c21dce21539a84616b78f2922ab4415bd5737b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/291efdd59545c4e1adc22827df6efe5596fd14b3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2925de604d84da644e2d0611e8388b2cca801b46` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/29d8d47a8239ba9be4ed582b59c0c83f874eb46d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2adebeab450dc98a16e7213d02b76a9ae2518531` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2ae77e0441f423b3c707a5028eb422a1147a27da` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2b52fee45c76ee3cb252f14d12b4c0c88da7c80a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2b9b62e6ba62dda08c4ba3276f5657d2077287db` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2bfee636ccb930fdaf7b973e508d1d4d2ba18558` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2c9f30363cf6ed6b4fdfcc0e2001a5b241d7ba52` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2d0d151ae38960874ca77e8d2de2933d70e7ed6e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2e0a431b17d50d2ec42620c371e7c292db532911` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2e9bcd0d12f24956fdb3bd6d0219de87794ac6ee` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2f16fa68df545dbbc352dd64cbf3321caa79fae8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/2f5a343a48f443b494da6f33b0608b26036eb656` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/31ab60d8d1ec98404bf010571fa94fd482202b59` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3263b4719838754a8272b845372ca42837b8903c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3347ecfeb5dcafefd509f7ef1f5b6a3ca79f4b19` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/33a739524383ce2c0e0091e83c94629a1488a441` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/34f7abfe5d11e8252a06cce0f6198f1e025cc8e3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/357e1b491afa5c1fd4f596e78523f7da665f2391` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/35cef0bbed9fd3170227c70c3d0982e642676ef2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/35d803a9edb6673bfb5c8fb769ce3326595742b2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/364a50da51c273c1af5ff07d68b013f262bbd9cf` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/365c236d48587d0d938d95288e7c105eed666203` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/36f5f8665fda18f80daa38c323bd29d9954b8e47` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/37224f9e7441b0766ec21de8976e929b15ecb7b5` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/376c6b10d71429335d773b864399cf3393e51276` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/37d3a2b0cc0cb7bf37ef240b9d16609bed5464e6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/39ab8bd38dd1bf8375d420ed6d60f26a85e5c196` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/39b1128def1712d7bb1de86e7a2b435ec879704e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3b596c5e671153e107a4f6b4bd4ff519903ae2c0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3bfa10acd89226ec458f663a9a52db461506384e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3c1da0e4da933ef3ebe4ef479cab194164e7d609` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3c942bbf50bebc91e0a4245baf90ce3fcf9de7ab` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3d0f73b9a0ef67f70f4beae54f0080a853c38e38` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3d10f08343fb168e3127085d5530a94b06701bf0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3d72f983ce01274af4c5dae17efd1deb3b07ce1b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3dc072d5ed118827d4a9ebffaf1f687efe5a761b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3e7c100b203febf6f2bae60dd426bbb28078fcca` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3efc8475079fc31900a488b79501ea04379bcd67` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/3fa85302e588735d41ce66a8c9419aa8f3281cdb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4056ab5eaefeb1620c9202d31a95147e7fbdaf96` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4071b8d0b1884bb55f7b115d460ba6101199c571` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/412bfe5a8626e1a4fd51e643a0eee0f8b73fddd3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/41b705fc836eb3d28dd35107fd30599487c2b254` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4216f24697550de658030b522887d9797627f731` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/426fbd6c89070af480ab3ed6b247b7a14b3e8650` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/438e827e7d11140e86bba29763b5ec8a318c0367` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/453bb14d2d7b5874f6fa7acadd8482eb5481aa7b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/46d180ae4d21c7cd3ab1eb8d5b0984b213f23177` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4717b9539c40f6edbfb9ac6f90fbd663beff28b7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4a5dd0bb8fe0db02c9b9bdaf88c51759530d98a3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4a70487089976789d6acfaaedcb58b1ba02aa52b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4a8cb5c63c1d486eb65960ea9ee6a417ecec8efd` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4acaf9df80c7bfd3c47e578eb15a40a2d8622099` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4ae52dcaf6d11ee38f5ed152fc94aea057d7f80b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4b2acf1f124df312d7fb7f7a5dbc0f6dc9c9c0ab` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4b2d26d186d079c9258bbb91ff03b4114c73cd4c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4c98f1abc9d6c542562df99f283be66c381747ca` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4ca4775ff5c9da1666b10b8df86ddde7a4b65126` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4cf7048709f00562ef009d43cb05992384856613` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4d4f90b67c0694546c37beab058db471d9670dec` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4dc6127ca7c02a4c22b8b233d4d90684e1a84a7a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4e9eb3d1f8b050dd8d217cece848e6ab45b51bf4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4f58ca7d1ca8bce9ba6dc0ab30d722050343b2e8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4f808671e0d244970bb8ee55b8d30229468f766a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/4f8d715a44f6be4afeb0c99e225417f5d0a8a556` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/50005e933929bebbec2dcd15e826f4768a160a68` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5157c395357319d1ffd150dde875055850a5f9b2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/518d1444b630af0c38e594cc45609173807f7685` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/51c2aac0e67e0864262943e24a3c631ce7f1922d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/51deb8c82695badd6db3af91584b8bb88a3a5748` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5200f7e690e1beb71aa80c5b283c4c9b2705d329` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/53a2c687df93a17443512e0f2112031c8927ae15` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/53b01610fc36786a1b2b3eefffadb8c3e65de008` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/53d8037455d44b11d0c90b0356bd81d26429aea4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/547f53b501c24a8ebf564dd93204ae08b9f09a58` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/54b860248d3aae0cf2dc52644803cac2b20f20e9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/551e3817355acef7f446a578dc0cd01723861f77` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/55cda2be4689dfe1a4a909d2aefad389244fd6b2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/55deea47f0cc1774354b338345f9b6730fa008d3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/561d15ff57704c330e48308875ee4eeef7fdd69c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/566e17d9320304a6d936bc7340451e88a4db10fc` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/57f81a3d0431c9833b704a07e0dc61309692e05c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5805225566b00faa6d40e03a452faa214c309f3b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/588c6c22cbb578ce57ef3b2b5a7dbee9f08548f2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/58c73a2a38cf69338667aacf7e575a076953025e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5a3831bcb41f80afe9e287cfb976988085882e34` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5af03b3fcf1a657194d4ff7e76b1f8d32bf19761` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5d1a51fb6f01338406d82ab6b69b0f41f0581816` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5d2d9610658f9f656cb8609bc66718f2eed22558` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5df36b11a40ed0a3fa3a4c00344cb8bbfc0a4b46` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5e8d25b2ce8037990c43c2270d6425cae900163d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5e9c59d9527cb5607f0686562769dd8525ef5b4e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5eb5193a7f0644b6bf4446d77093db13a03d6c97` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5f08e62a23ca65b94748e2f10e516caddf598c9d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/5fd5067663d38ec6d687445a7e2c18315d7a1840` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/60b9fc755552a6b93eb3b9568f6158d19538fb5e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/60ba96180d20c65a20c9f432bff6c2b1baa9a725` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/60bee870a6ef25757dc80483466ea639370cd22c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/60c00b44c26d2fe2395cc4b83080b0e84ed65b0f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/612c80a0bfce6b60a0d87357240d3f1325b62217` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/614ac4038d1cfedd2c55fec5e054d50c61d6bcf2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/61b30bb3b9a010a364666ddd7a50f2f74ac58534` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/61c0d607172cb9776eb89c3a611d02820afd4fb3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6212dd3e7b994d85fc8a542e098089a3e4153ab2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6228c9bf0dd1c4271e255d20bfcdb0321e88a8a8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6254c192ccac6b11b3b0a737f242f57e8ff05147` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/63220d82faff1526bd5f0d25ca256be25be41003` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/635b96c9cd8db3930f36a2491d73ed72b978fca6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/638fd3bb274d916e354310c11f12ec571bef2cda` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/64728b6226c7c082362f2c2dc08ae3ebd012a7a9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/64ca3254fcf355e3ac20bff72833d167148ceeed` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6585aa813dd6f58fd3dee88f3cf1a439ea75c90e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6605994cb7a897ebaf59385cb47da3d14af8275c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6613552faa9ce1dbc8291c45b22b943e0bb2c72e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/664641c46de3823df44cf6a41d3b9854c88b36ee` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/666079c913db1e07df2bfbf644bb32307d04b19d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6667763bbdd43d65b88fa6fc819a82191b475607` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/66899940ee07af4d396332f4fa944e725d00726f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6758817910922b0cc74b099ba571ec3653e67ab5` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/67594a806f55ec6423e91bc787a357a21f836074` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/678aac634e5fd3329abb5c9a789379969e05332e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/68375a6fa4c6fd6d9e99217f48e03e3b3d6aa9dc` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6897ec0635df4c586487123e5e6581e9aa612101` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/68d78a27db0f5d854a7088ba8d5b955c3c91ece7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/69586da3af834b7e0bd2dc178b45d7c0d6696e51` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/695bacdf3e03a669c8130b89b4aa01a2e5150f99` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6a329563664d05e7012c6b6ac225b2b5c4b4575f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6a531559b7c8193f629153c24b66bf5f8d9b35ec` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6a61c9d0b38f0fe381efe8573dd6bd26618134ad` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6b7770a43eb428d06f778e7dad7788fdbee5f923` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6b8c69d59b0b23c3ddd564aa76ca7ee19913d17a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6bd5551f859b90f41b292bdeaa48b84f9dfede3e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6c41f0365baaa53ec04f31abd416dd3da3947cf6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6cdf39f282f96d2c3952031c443d228066672d3a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6d127b91c550643c493760035aa7fff8d7bdcde2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6d90dd4d38cfe6b4739178525233b73eabc609ff` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6e27cf4714c2b774f0ef9333324aed017e0ea10c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6eb12cc787501d8341bf70b873201c477e35f095` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6efe401c2b3f79a91601eb039a7a1e09c8ddc860` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6f6471797c21379149d511b890e6523fdbee3fbd` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/6f659aec357ef097bfd557481a9e1e68735ec382` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/704db62e36e25b224bc3d49783c1da7a374be370` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/70a15f8c80bda085a092ab49b4304cf03f364e91` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/70b7207091db9feff9d2d13ec22b92c8e9aa84b1` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/70e1f959de16e32fce4795ce186826d59230bb41` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7137553c086fe7c71f5536df3eb896766ac30fa6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/71c9145fa6014d0dbcd60b33bc022c0d24b394e8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/72118bcc8ddae17a31155f3483e6908c48c95d4d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/72449e0828345131aae4d207738581d8ac16fe01` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/72cc04cd931b6c23407529f397d50997e350a89c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/72e143691d15bc52ecbca9afbd4142326f397fc7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/72fac7c0ab2ec1b940321a124dd18ffea78400ea` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/75db1cdd0a148f674c10f852632728e07c5cc5d2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/75f0dad6030658d868cb1a8367eccdd8176913de` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7604cddefaca5706b907a6280ff89e5c6f4294b7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/771f1975155d468e7a2aeecf38f29a9976ca8753` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/777d862ee61c1072c03ea194858d7ca8282a06e4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/787ba4c81a5ddfc1700d53204ac1e642a257bc25` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/78ad6c9eea003dbdfb6b30ecd28eaa1c8404b3e0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7906060f1fd6c8c5d756d2289cc151d1af93fb2d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/794f826b97ba4dca6b6845ec00dedf9c4f986b4b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/79adfb9ff4d4d3c0070e18e169aa69886815c29a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7af6a0f9fceae920aef3a6d07c2323eef894ece7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7b262b109fdc5c3fa4c13fb5633d1b554a0c6da0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7babdeca53d0a19e9a82a12a14006810aac109f5` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7c9c34109d5620b9a88d2ba0c95c7496cfa4da6e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7cd5a33b832d390d4b23c36ccc4d934dbe97e232` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7cdd65932a91b19f4acb6d174d9abcb313b41077` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7d0c03814611b128f9b2a11642e2c88993743a6a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7d3e47a3d0c09d66c478367ac7d4584e85f735d7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7e1628f52f26865cb769a2da29d212c9759fbb0c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7e29d3ef1c69d0594dd6b9dbaaac3cd6bef63ed8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7f032a35cad82e7b996d753a5dd63ec0adae9e98` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7f71767d331dde8ab1e7419afdbfd2c284c58a60` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/7f9810b7d83ecc0b20893b9dbbd2b879b1c7a717` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8037e471944ba0301b81a44e3cd93092443246eb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8091a06ccdc524f2441bb056d511946d89667a44` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/81116e8aa037df7430a75cdc00ebcbe02466748c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/812a7ecc0e508c2ed230ad47ea67b5163e41ced7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8140a75085339903076163caaeb85da18c1aa49b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/81884c7600d2e91624a61598c3fc34c9e444bf65` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/81cbf91ffd9fddfc85412e965bb636c52bc3713f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/84b12a080b951cf582c478b7f8d64f0802a09c68` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/84bfd8e2cb20307e30b16a239a61cb6b182d1ce0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/84fc343f495c58d0c9e48ec4a0bd3fb9255f0f79` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/852deba20cc1691926bcd633804ccbde5800e3cd` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8542a9b0d488265fc91b9d6ae07116402418058e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/86287c8e8475fe0707eb47ee099f0e20552d07a3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8670b89b9e37fb34650a2d7f0948a225d9506f86` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8696dbf5ba9623c4ea507be4782d1fc46a11c697` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/86fcecc3f7373e4a7172d71e9bcebd05fa305d65` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8756e1c40411018aa7760af399528166a0ae93cd` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/87a2f98e0df790baa7ca4efc6540d62b5f323de7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/87aa700bf0e793b137b6b5e5eab9670df835974a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/87ae9c67e48132e3931b6cb29904e39d6d5e5957` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/884502cc0e2fc85034faa30848080555e019928e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/887e6927546771847ca31fd3344fdfbf0faa4cbb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/88a21482c8c4fcae30694007711aa8a04d72d9d9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/88bba40ecfa8697fb8d668472d25137d360bf285` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/88de9847ddb87d9daf307dda62876969ecbe3128` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/88f9999c1227f5a8936e74db05f1da41ebc28497` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8952edc3c1cfa2f7f6af7a3403638a4244a0fbb4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8963f31590721ee27f807fdb8f4ffc9992aac694` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8a7cd5d4a374ea8b06a84213c3e94d6506796c1f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8b2f9763893241df3e504fb9770b3765b53a105a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8b88f4b6f2143c4203ed293bd97d8af9d2ba3832` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8bf572c999d091187a3e8ffd8a6383673418eeda` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8c7fb4ab193626e2cfb7e505c1a11b5e8a5793bd` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8cab2d5fc45008ef7ae7a98e7660eb7214ad2d55` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8cb231ab735b0b2313459693b5506a93eed9ff56` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8cf269140f85baed78f843b468b8ecd4bb59cc2f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8d7052425718406f02ce3ab83f75040b70b33237` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8d82ba2c7d2cd18b4a4ae8b74cd04cf812223a79` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8df284d63db15e0f4063380e5bb22e72746ec8cf` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8e1a2e15dc91f1accd2bf0547857b4ee2dfb5a20` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8f1d9e775d403cfbb65ff44c68ef7843bd5a7889` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8f49c0fd557234ff402159c4a10b788dd4c09946` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8f6877c68107f8ff12014980b6cb6d7ebcb23a27` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8faa54b211a4b7b6ba2aa7a9be6426cbe90f12ed` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8fb9a9f99b15023d7ba9c80d62b18f59d4c77dfb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/8fc5a6ecfc0496812f68ec49cf5d03978d64969a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/90ad53d72f1621c6ca47585d453872a7b101280e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9197320470a685f6d4f44252dcfddb2bd6dd204f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/91df65c5fd1d4ca018f289d7c38ee98a65c00851` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/91ed9a96157478b98a26e1f5f4ac19bb00fe6760` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/921750e60254531a040a939c8452fbca6e4a3197` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9277ad594129bd7cd8ca05e9e7784424a9ca6558` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/92f78e3300b4675bfcb20a61e0e4d46476ea42a1` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/934a8a336c06d648bad51c7108870bd6456c00e6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/93caa70abd564417f230f6fd850e9e317bad74b9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/94b1f3337466b50274f0a78f49cbcffd0885e73b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/94eef94cdd29851dd9e38e5739fc70c6daadffcd` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9514b0e00f4d8b609d602b4de0fa49271d87ac67` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9572019d1c3eeba269bb945fbafd3617d1e238f7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/958d68cd93eeda89a6ad029214f6fd309beab83a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/959a6479c8801abae51c5166a668a1d798c27b52` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/95e53663ce5958fb7de0b96ef5c54d9fca96ce86` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9672da7bc3801be9ca4c12624442399ce9ae3bca` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/96c22a17e486389b505c08d7631365ad1c38eced` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9706d638bcebc9d6f12f0d17892f0354729f0052` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/97078b47db0bc6bff5f2d7b69e71e7cf0f41828e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/97e84beb755a276bc39ed6799fb187ba4764fdd1` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/97ea2e62f9bf10da44ee575d080241c6fc7881e8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9829b6f74db43d73bc884149628085cc1c29bf21` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/98cacc18831a76a381a5f8133fe90c80216a0144` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/993b91362cfa221bb8fe484fa9de91e14abb1ac3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/998c76e59d49e98791c40ed4bf21a541260d724f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9a29379e1a71c12e5e12a6fee182d38b3289e37d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9c14d5ebfe0a5b39652d07c7fda3f3062942c7c9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9c5e695db355a91848d8298000f09f367e37e76f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9c87a17c4b835f6675cfde958980ce2e0167812b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9ce7d6eb1f221c7a39c33dc673c79326b546e07e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9dd15551a61dc5e874bbe1f86b370e6e6512c454` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9ea09e69ddb78dffa0398033388f8228cfa81cd7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9ea10bdd123562362168c9ca0b008ed0ca538664` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9f4f93057a93f39df25c29781edadb0515c7f7e8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9f860122e792002d74dd7e9bd8457a70c65f9472` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/9ff10e6b8f17d5e08dfa62e51c9222c80da474d0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a1263de845c3eead1d989308b39421ec9fa3deb2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a15aa9512e5bf4b7afb8a38775531f6741aa7d5f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a1ae778c6cd497195bc223d2e45137e8f4079d44` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a1bcf709b01454ddc8f2d702595f5a0320871ef7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a1d3c600b6a4187113a9810a2f8653d0a36ac8a8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a26d9c481f2f7dc42e3031ae0807e65dc2137387` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a30e3ba280af96498e10b6552ac4681a527d84a4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a347e51eecf890d7930ddc929ef3be611a95ff62` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a4b7a1d2b8a211a51fac768e8390f6c7e6359ad0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a549be0344811266e6862596ef3f5e7b4043d7d6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a5a97535212490b6dadf9b78ed3980796fb25e97` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a5e95119c31e8a834092ded9a2e8797eea137b32` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a61ea1ab0d3adba8fe1f925eb5a2f02b241ec0d4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a6f6b10e211c81a094e68381046c3137ee9770d8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a73988959baf73e1a7330b6a684d0d162bd9197d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a75d007ac3ca2aefff74aef8e25c64016c14db8b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a7cb2ff12504c1efc28d51c77cf115c4d56119b1` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a80908cedcf6b55608d5667f10b6ef4384b70253` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a8100cbcf99e1d0306ff5b96a02ba11aeb5acc62` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a825edffb67dc9bd31a07cb3b2f59eedda737ba7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a892cb29d13f3aedf19d2fd22af5f9d09ccfdbe7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a920bd6da7a6cda1674aab86c2139b09dba89234` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/a96eb3ce8c436ffcd7420686f894723af4286a12` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/aa20dc977dc57d6b29d70ec74f04da0badb27288` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/aa9f8ac3c77423eefbb82fe33685ebf8716ec338` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ab0b89546eee60769f96f9dad6499ea9f6a86346` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/abdb2e1b426d18541191568d32ffd648df646576` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ac8c25aed838617e4a36871095377201dd27df06` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/acd23a37a48d65a0f78b2fa468f0b93411b9d27a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/aea2ae75e1bc90f80f9a163c79ac077b82d638dc` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/aef03ada108d257477b20502481ddff103b254a3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/aef40425d6a964f307db511b62761ba04b41be2f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/af42a3d266bf7d2bb95529bf43b92ad9805aaf31` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/af8ea393daf443cd3f3c8de88bcf7e5b23ce6c97` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b065f9ea0157d68d1c3d02dab01167e368650203` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b0a5664c79ef550cc42eb2213e31ca8f5b0fab21` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b0ed9b9a94661d495db623a3b93d1f3fa9b8da90` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b14d2d7979979c0de9635ea4b479c2997165d788` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b1ee39218142c5aebf9802e19d0131917d757060` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b27f150393856cfe67866064fdd9b6d738768efc` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b30716321e8246dc5fb5ec0c81f7eb52c510d9cd` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b3533574d1729eb4aa09127c724b4e40b932e7b8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b46d27d781be26e1530f91c8b941d3eba0dcc8fb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b4c8a9e486e5d0f7ab54108bb1b887014c79ddd6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b52123c0fe0b0d68d097b2fec8b3da4695b84f2e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b5f45a7aea8c314b40dc2073f1a917ab0d0cf483` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b73702c001f65fcf7acfa46a363a9c0cbb1fb138` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b75242a4837e6095c161e034647a33ac8a5ff7e7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b84689ed0cb315453802e5022865d643ea50e955` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b8e0c2fb6add4f46b7952783fea82b525bb0fa42` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b96c97042f095595b2f31d5d7857473d239e7f94` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b973ca43eca2278a0b167f9ab3de55e34cd536cd` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b9db375bd823718b28b69565b49409dbdf2277f2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/b9e584c030a65210d88184acd7acac77d079d495` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ba592b0f1fc1d6c047352b47a81e7e53ddf9e169` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ba6b06c2c43fa3ff647665d981066d66fd47bcdb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/baf3c510ae2b48cd9e76523c68ea4f47ab87ab31` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/bbd69b809f75d17d91c80b8f48d88ea413d222ad` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/bbf8d72f833644cc796c5b5cd3cc49017120db61` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/bd20cc4db7d04efce7e35c5f8a12b8b9caf16452` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/bd8cd4a2635fb041c97dcdc616c3d402a866902c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/bdd6753849b0f6f646e1d55a681cedd2c5fb4852` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/beb7573ea87f9af3caa9d61d57628ef25c4340f3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/bf022812b0f05b2f16b1da8b377b076527908799` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/bf58dcb299df8d64c64109efd601597ef8f69036` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c01c0f8140cba9686402f5c1095b33e2ed72de5d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c05eaae47c5376a9e578d80defdd3203887b6984` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c13b5f4a1f9454ebd7ceba65cbd72cc5e0d550d6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c21d084dc4b4c53c5b84b1bd1991480aaa096c9f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c2837737a89feb9945a32e7b5742e1174a1b7722` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c2c7a25239c29211c092ff4fc097782613e0124f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c396c8d29f9d7a8e772f739dbb974aee8c2c8659` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c3c0d944cbc8d379ea235e5c57852e3cd382abbf` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c5783eaf0507aeffefd7e0cc8f0e5a094b747105` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c5e7be0226a94f6d82f2fab9c9ab87aed3a23e77` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c63b0c1e0dfa28cb720940a574cfb4b2f6c4bf4d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c65c1f4777c5c48e7c89bcd6b41a56feb4229721` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c65efd32f9e700844d472b5b9485c098cc3efb69` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c680ef58b41da9a425d04b19630ed6dbadd81116` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c7bbaeb7da71acef9155fa2c3e91e29724e3e071` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c86345110dc25dde34d8dbb9083c320e51436de9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c8887762b665419db35a7dda368ffef5a19e1dcb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c8e46c09a6222a9a49dcf4783c3a90a163a39fa7` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c90274319f35502726191e63b85c055a7de0fa28` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/c918b244225a37421910704f977773201f3d97f8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ca8e75cfb24d78729cd9e786c14f2770f193fc8a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cab279e5a541a142bb9c0c95f045871c201c6a1b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cafaa91e9ce8b0ff3df9f5a9afe9c8433595357f` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cb38c1034fadfc06e461ecac77e79b2bd16d966c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cd5def98e7e2b5de0d02fff836e3c13e47316e3b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cd7fd9f3d8ab6a6703f1b1c4959ccc0e5f3d7be1` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ce1e17ac17ae5f886e0d843a949788ddda89d692` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ce525c01e61bebf031d4b906090f5d79dd7479d9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cee78b8479c1bf785d2f22934c17d1b22059afa3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cf18eaa8b06a104ee3641c55ff221fc586da2d86` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cf41cf6bd70f5822174a134c77c2591642ec9e39` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/cf7a54ee3891293a6228e0f27d5d8739d180ae9a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d05d1dcb8a28c42edfb12414937c1c305f7e71ee` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d14c4bb1832e223190d01c46e553fdae65f31315` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d154e9e24b2bdea66515339aa54bded669ef0a79` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d1c6d5000979f5f83097e12b8a06fde06cfb31ca` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d207baa84bd3140458d12d8ee71b79bfb9b9f548` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d22101915b7c93b941147e6021c5bcddcd337b53` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d23cc3c8c4299a2c72ccb595d57bdbb2995d4cae` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d2457761652f1bb8f941f2b77e1aab1e40c59a91` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d28dde8aa7478151d25920c0b7aeb4ef986cfd56` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d419b9994841fdd396be8bc0dabb787c29b6cfe8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d4505371077020585091f10e10db29d54b839079` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d51d87b6f899b075cc690720b011d5a719a7fc26` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d63752355345b4f8c22925f0cc09aa623bcd3d3b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d6e926f9754abf481f38d629d6c9bab7ab5405ca` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d76d0be1feaaeca31441b7463d2ccfec158b261a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d7d5235d22d876a259d9c1483a0e8f17b78d98c9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d7e580ed7f102aba1121829979840924c25aa973` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d8c893652f3cf11a21200a1f6b2b639ebb35b761` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d8e411ac94e7134c4a39359102285e82cae972c6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/d938f8581251185d412d67c4aa4ed836a1ef8fd2` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/da5e6a184222ec5017cf53d7dfbfe5dbc58da0f5` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/da7b700a72cbc637cb623178dc66d3114403da65` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dad69d99e53f6509a1bf207742ff3d55dfd19389` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/daefc584c18d6c3b8c362c13e6af5176bd3f2cb9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/db78d9b1063ef8cd96015459114d7a4ead40a972` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/db7caa4fb673961450202b77e9c9eeea6c110402` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dba40a326645fdfeba7479c8916972c19d456e55` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dbc26fad935a8d9a95bd4c35d65452f9571046c3` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dc4e86d3594a9ae7abef7ad99fab97dd38352bf8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dc6a00012b772f2717a90b51a525b7bbe574609e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dcc566c3458a5217e9b31687fae37c33c5225e20` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dcf7a34dbdae94148fff92a5c704d0f5be521c9a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dd430cc526c54c37ffe935bd6084dc6bf728d023` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/dda9c7c4887d375784f4758baa414061273945c0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ddaa206c241a4e453febc85f3c094581f3e1a923` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ddedb367dcb2fa856d9a194afa0765675a7d8681` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/de990f8b749d7132c4007124b1291e8f72e2bf4e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/de9a115fe564a823014faa764d9e3cd5fe83a788` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/df64a22735c74da437e57ea35b5cbf4ef12f11bf` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/df71d599ed798d0b36823055b1eb02a8367eac5b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e0a7dbd8b23accf4abcb5f1aae99cc9adc26e117` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e11526f01c5ff785fd00d0fcce34c477a94d5aae` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e127e4ed18d0049809a23eb42300573dc90d3710` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e14a85920b0aa924a6c812b3bb5f534457424ece` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e2e30ff2d12c3d56b61db7cb5240e7292808c4eb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e2f54687926969fd125c550a44e4e8309b4c3b9e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e300e640999e4acca3fd70353dc454a00e3edbfa` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e301505daca4b41363b3356bbf3335ebd3efa50a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e38e2c54a2ae19afceb0621c9e755940b2b1fdba` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e4c1a2aaff4ddcaef9444c04065528ea6c6d8105` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e4da9ad4dd78f4b57dc72766efae4676fa5d2236` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e4e2c4022ff73c95cbca6fd74a47a9bbabdd082b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e57944381aba407c8780ee841a1120310fe22d1e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e5c8fe967060f3469b5f6e65bce4e6138aeefa77` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e6707ec4e8aedb217f0b599fdcefd4bc29960528` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e74f2e6339ca0d7393067e70c5b4c2c647c17f8b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e77052c13d217e676f1731a0955e155558c61ac1` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e77409f389b8b8b2ce2312c13d155fdb530119a9` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e7941d338b526e29be4b5682bc96d15eef1a7167` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e7fa0b6966ed4022a0e8c15917c0ab4bb3e8c134` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e80236036468dd320f695303b13bb83c542c9fe4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e85b60c7e7c83834d65770fc2f5553db8f951010` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e87127acf8dcdb0b519e8614ec00dda2d6f9639d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/e8712a92991ffbbec090da3264685df0cbc25832` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/eb329ab7657c90ae88c49e0d0bb1e8547f4c5412` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ebb6cf326e2a7b4ded53a27e1319d7a7094ccd7c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ebd1c965ae87f691b9b392f8b118a680949461ac` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ec0c8fc85abedffa1512b8f35e95347e0d2431da` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ec807fbeb27c582b6eb2c4ced90a926a0a170129` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ecc0193ceff466f8a8136caf003fca9a49caa555` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ecfb80a16db0793301954d2bcbc06f5b5e483382` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ed67d0530c71024f6256e1befdc48854398ca15a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ed896c068afce0d94581ba9e5c7642ce3803c8f4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/eda3047340cefb7de3470f38439e1dc24ee2fde8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/efefc060cc0d7c6f50e28e180b26a0754a1175e4` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f0877afd40e1fd8c09206daffa6ad1cf7b263dae` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f0888510c51c09434b50378baf446ee42e169d87` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f0f1d5b33b4420697ceb131b28fd15006e2facbe` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f142a6d8a9cfb7903f3e1e273923a2e165bf8067` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f14e0e8535665cd117416cb0dfc653a2401500de` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f1d40a52b0e618ebf9cf13f38e9444e32fe0f90d` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f21b40a88c6b4329e5aa5302b703d43cf9709ee6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f381b305438c2028fca6ee32de7f70b4737dddcb` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f3b63a713219cf4450445e6c0b2d659816eeb2b6` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f3bfded5cd4dba9f2ceb6af3dad692c201bec169` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f3c921c42e19258ab08fcafac507b40eb4da6a48` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f4056eb90987d8e27d7886408017f992240bef9e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f5a44bcccc520222d5e7ed9634e82281260c8752` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f5f029c99de5a1ffdd523d988fd5af5d22b7bc2e` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f6aa3b74d1f21e58cb729486ca71375e0bf5fb00` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f6f269f58093439284030296753f5331ed0dc627` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f7810947144305f077b88da70b3573b1eaafa10a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f7b52d447d27252d4cfb31754f466543d545fe69` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f7c6262899b526455066f8de9b77dc183d6fa26a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f7d49ce4c00c36928d6917990592059ce14dde0a` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f7eebbace0cfb67979c629c663f25788d0cc7b3b` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f8f43e4871c9e11908953c020f6ef8a368170042` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/f938bf78ec03ceed7a8f51b7559a9d39ab064a48` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/fa74f05efd8b6f40e411eb399b20e858fe2ec43c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/faee5fc60cadf04ee6d2f34f8d3eb2e9e2e4e5b0` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/fb924e571ac9099e55659e1096a3907e95687f02` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/fccf543af141fdca21cac6ee21835272658344db` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/fe5ead45a811ee2a2f12053358cae921f4254619` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/fed9a8f53857f500e17a44a80d2e1f3fb9b7c644` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ff0b5c78765385edca1fea6600ba20f7220997db` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ff7e34f322db06b33e8cfa62c60aa557f25028b8` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/map/ffea879a0d52f16f0e77c9ee8c4e3a40c0c8be6c` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/message` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/parse` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/raw-refs` | Git history-rewrite mapping metadata retained with the repository. |
| `.git-rewrite/revs` | Git history-rewrite mapping metadata retained with the repository. |
| `.gitattributes` | Git attribute rules for repository content. |
| `.gitignore` | Rules excluding local secrets, data exports, dependencies, and generated output. |
| `.npmrc` | pnpm/npm workspace configuration. |
| `.replit` | Replit runtime, workflow, artifact, and deployment configuration. |
| `.replitignore` | Replit-specific ignored-path configuration. |
| `CORE_USER_FEATURES.md` | Project documentation. |
| `FORMS_MANIFEST.md` | Project documentation. |
| `PUBLISH_CHECKLIST.md` | Project documentation. |
| `README.md` | Project documentation. |
| `SC100-Preview.pdf` | Tracked reference or generated PDF asset. |
| `SmallClaimsGenie-Investor-Spec.docx` | Tracked project document asset. |
| `artifacts/admin/.replit-artifact/artifact.toml` | Tracked project file. |
| `artifacts/admin/components.json` | Application configuration or structured reference data. |
| `artifacts/admin/index.html` | Tracked HTML reference or preview artifact. |
| `artifacts/admin/package.json` | Application configuration or structured reference data. |
| `artifacts/admin/public/favicon.svg` | Admin dashboard static asset. |
| `artifacts/admin/public/logo.png` | Admin dashboard static asset. |
| `artifacts/admin/public/robots.txt` | Admin dashboard static asset. |
| `artifacts/admin/src/App.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/accordion.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/alert-dialog.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/alert.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/aspect-ratio.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/avatar.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/badge.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/breadcrumb.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/button-group.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/button.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/calendar.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/card.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/carousel.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/chart.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/checkbox.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/collapsible.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/command.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/context-menu.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/dialog.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/drawer.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/dropdown-menu.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/empty.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/field.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/form.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/hover-card.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/input-group.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/input-otp.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/input.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/item.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/kbd.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/label.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/menubar.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/navigation-menu.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/pagination.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/popover.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/progress.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/radio-group.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/resizable.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/scroll-area.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/select.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/separator.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/sheet.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/sidebar.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/skeleton.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/slider.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/sonner.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/spinner.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/switch.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/table.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/tabs.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/textarea.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/toast.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/toaster.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/toggle-group.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/toggle.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/components/ui/tooltip.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/hooks/use-mobile.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/hooks/use-toast.ts` | Admin dashboard React source implementation. |
| `artifacts/admin/src/index.css` | Admin dashboard React source implementation. |
| `artifacts/admin/src/lib/api.ts` | Admin dashboard React source implementation. |
| `artifacts/admin/src/lib/utils.ts` | Admin dashboard React source implementation. |
| `artifacts/admin/src/main.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/pages/Dashboard.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/pages/Login.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/src/pages/not-found.tsx` | Admin dashboard React source implementation. |
| `artifacts/admin/tsconfig.json` | Application configuration or structured reference data. |
| `artifacts/admin/vite.config.ts` | TypeScript source or configuration. |
| `artifacts/api-server/.replit-artifact/artifact.toml` | Tracked project file. |
| `artifacts/api-server/assets/fl-forms/cl-219-volusia.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/clkct333-miami-dade.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/clkct423-miami-dade-summons.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7322-summons.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7330-auto-negligence.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7331-goods-sold.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7332-work-materials.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7333-money-lent.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7334-promissory-note.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7335-pawnbroker.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7336-replevin-govt.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-7337-account-stated.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-fee-waiver-1998.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/fl-indigent-fee-waiver.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/florida-small-claims-rules-2026.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/plain-statement-of-claim-orange.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/fl-forms/statement-of-claim-hillsborough.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/forms/az-aocdfgf1f-fee-waiver.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/az-ljsc00001f-complaint.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/az-ljsc00002f-summons.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/az-ljsc00003f-proof-of-service.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/fl-clkct423-summons.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/fl-soc-7340.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/fl-soc-form7340.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/fl-summons-7322.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/fw001_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/il-letter-to-sheriff.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/il-smc-complaint.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/mc030_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/nc-aoc-cvm-100.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/nc-aoc-g-106.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/nj_complaint_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/nj_mv_complaint_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc100-field-map.json` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc100.json` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc100_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc100a_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc103_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc104_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc105_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc112a_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc120_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc140_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/sc150_acroform.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/tx-return-of-service.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/tx-small-claims-petition-jp2.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/tx-small-claims-petition-jp5.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/tx-small-claims-petition-oca.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/tx-small-claims-petition.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/forms/wa-misc-05-0200.pdf` | Official court-form template or form-specific rendering data used by the API. |
| `artifacts/api-server/assets/fw001_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/fw001_hq-2.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/il-forms/il-fee-waiver-civil.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/il-forms/il-smc-summons.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/mc030_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/media/paul-andrew-podcast-poster.webp` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/nc-forms/nc-aoc-cvm-200.pdf` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc100_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc100_hq-2.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc100_hq-3.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc100_hq-4.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc100a_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc103_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc104_form.pdf` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc104_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc104_hq-2.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc105_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc105_hq-2.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc112a_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc112a_hq-2.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc120_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc120_hq-2.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc120_hq-3.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc140_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc150_hq-1.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/sc150_hq-2.png` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/assets/tx-forms/denton-citation-request.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/tx-forms/tx-rule145-statement.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/va-forms/dc-402.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/va-forms/dc-409.pdf` | State or county court-form asset used by API PDF generation. |
| `artifacts/api-server/assets/wa-forms/wa-misc-05-0100.pdf` | Tracked API rendering, form, image, or media asset. |
| `artifacts/api-server/build.mjs` | Tracked project file. |
| `artifacts/api-server/eslint.config.js` | Tracked project file. |
| `artifacts/api-server/package.json` | Application configuration or structured reference data. |
| `artifacts/api-server/src/app.ts` | API server source implementation. |
| `artifacts/api-server/src/assets/fl-forms/cl-219-volusia.pdf` | API server source implementation. |
| `artifacts/api-server/src/assets/fl-forms/clk-ct-333.pdf` | API server source implementation. |
| `artifacts/api-server/src/assets/fl-forms/plain-statement-of-claim-orange.pdf` | API server source implementation. |
| `artifacts/api-server/src/assets/fl-forms/statement-of-claim-hillsborough.pdf` | API server source implementation. |
| `artifacts/api-server/src/assets/forms/fw001_acroform.pdf` | API server source implementation. |
| `artifacts/api-server/src/assets/forms/il-letter-to-sheriff.pdf` | API server source implementation. |
| `artifacts/api-server/src/assets/forms/nj_complaint_acroform.pdf` | API server source implementation. |
| `artifacts/api-server/src/assets/sc100-official.pdf` | API server source implementation. |
| `artifacts/api-server/src/data/counties-az.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/data/counties-ca.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/data/counties-fl.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/data/counties-il.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/data/counties-nc.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/data/counties-nj.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/data/counties-tx.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/data/counties-va.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/data/counties-wa.ts` | API seed, court-directory, or reference data source. |
| `artifacts/api-server/src/documents/docx-to-pdf.ts` | API server source implementation. |
| `artifacts/api-server/src/forms/ADDING_A_FORM.md` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/acroform-filler.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/chromium-pool.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/az-complaint-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/az-fee-waiver-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/az-proof-of-service-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/az-summons-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/denton-citation-request-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-acroform-util.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-broward-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-cl219-volusia-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-cl219-volusia-pdf-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-clkct333-miami-dade-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-clkct423-miami-dade-summons-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-fee-waiver-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-hillsborough-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-indigent-fee-waiver-acroform-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-orange-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-palm-beach-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-plain-soc-orange-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-proof-of-service-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-soc-acroform-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-soc-hillsborough-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-statement-of-claim-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-statewide-summons-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fl-summons-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/fw001-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/il-fee-waiver-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/il-letter-to-sheriff-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/il-proof-of-service-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/il-smc-complaint-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/il-summons-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/index.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/mc030-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/nc-aoc-cvm-100-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/nc-aoc-cvm-200-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/nc-aoc-g-106-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/nj-complaint-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/nj-mv-complaint-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc100-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc100a-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc103-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc104-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc105-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc112a-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc120-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc140-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/sc150-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/tx-citation-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/tx-fee-waiver-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/tx-petition-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/tx-petition-jp2-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/tx-petition-jp5-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/tx-petition-oca-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/tx-return-of-service-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/va-dc-402-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/va-dc-409-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/wa-notice-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/definitions/wa-service-definition.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/enrichment.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/fw001-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/mc030-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/sc100a-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/sc103-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/sc104-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/sc105-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/sc112a-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/sc120-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/sc140-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-names/sc150-fields.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/field-validator.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/generic-handler.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/pdftk-fdf.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/registry.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/sc100-acroform.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/forms/types.ts` | API court-form engine, form definition, or PDF-generation implementation. |
| `artifacts/api-server/src/index.ts` | API server source implementation. |
| `artifacts/api-server/src/lib/.gitkeep` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/admin-auth.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/beta.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/case-context.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/download-tokens.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/email-templates.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/errorLog.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/genie-conversions-cleanup.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/logger.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/objectAcl.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/objectStorage.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/owned-case.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/paid-access.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/pending-upload-cleanup.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/purchases.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/rate-limiter.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/reminder-scheduler.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/resend.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/topic-guard.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/tyler-court-sync.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/lib/tyler-efm/client.ts` | API shared service, scheduler, validation, or integration implementation. |
| `artifacts/api-server/src/middlewares/.gitkeep` | API server source implementation. |
| `artifacts/api-server/src/middlewares/auth.ts` | API server source implementation. |
| `artifacts/api-server/src/middlewares/requiresPurchase.ts` | API server source implementation. |
| `artifacts/api-server/src/prompts/chat-prompt.ts` | API server source implementation. |
| `artifacts/api-server/src/prompts/demand-letter-prompt.ts` | API server source implementation. |
| `artifacts/api-server/src/prompts/help-chat-prompt.ts` | API server source implementation. |
| `artifacts/api-server/src/routes/account.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/admin.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/backup-download.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/beta.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/blog.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/case-classifier.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/cases.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/chat-export.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/chat.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/counties.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/demand-letter.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/documents.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/efile.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/forms-common.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/forms-token.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/forms-unified.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/forms.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/health.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/hearing-prep.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/help-chat.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/index.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/sc100-word.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/source-download.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/storage.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/stripe.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/routes/transcribe.ts` | Express API route and request-handling implementation. |
| `artifacts/api-server/src/scripts/test-admin-beta-access.ts` | API server source implementation. |
| `artifacts/api-server/src/scripts/test-missing-facts-all-claim-types.ts` | API server source implementation. |
| `artifacts/api-server/src/stripeClient.ts` | API server source implementation. |
| `artifacts/api-server/src/types/express.d.ts` | API server source implementation. |
| `artifacts/api-server/src/webhookHandlers.ts` | API server source implementation. |
| `artifacts/api-server/tsconfig.json` | Application configuration or structured reference data. |
| `artifacts/beta-access/components.json` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/index.html` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/package.json` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/public/favicon.svg` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/public/opengraph.jpg` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/public/robots.txt` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/App.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/accordion.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/alert-dialog.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/alert.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/aspect-ratio.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/avatar.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/badge.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/breadcrumb.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/button-group.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/button.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/calendar.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/card.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/carousel.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/chart.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/checkbox.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/collapsible.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/command.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/context-menu.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/dialog.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/drawer.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/dropdown-menu.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/empty.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/field.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/form.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/hover-card.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/input-group.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/input-otp.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/input.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/item.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/kbd.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/label.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/menubar.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/navigation-menu.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/pagination.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/popover.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/progress.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/radio-group.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/resizable.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/scroll-area.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/select.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/separator.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/sheet.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/sidebar.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/skeleton.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/slider.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/sonner.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/spinner.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/switch.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/table.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/tabs.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/textarea.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/toast.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/toaster.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/toggle-group.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/toggle.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/components/ui/tooltip.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/hooks/use-mobile.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/hooks/use-toast.ts` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/index.css` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/lib/utils.ts` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/main.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/src/pages/not-found.tsx` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/tsconfig.json` | Beta-access artifact source or configuration. |
| `artifacts/beta-access/vite.config.ts` | Beta-access artifact source or configuration. |
| `artifacts/mobile/.gitignore` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/.replit-artifact/artifact.toml` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/README.md` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app.json` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/(auth)/_layout.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/(auth)/sign-in.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/(auth)/sign-up.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/(tabs)/_layout.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/(tabs)/index.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/(tabs)/new-case.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/(tabs)/profile.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/+not-found.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/_layout.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/case/[id].tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/app/index.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/assets/images/icon.png` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/assets/images/logo.jpg` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/babel.config.js` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/components/AIGeniePanel.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/components/CaseCard.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/components/ErrorBoundary.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/components/ErrorFallback.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/components/HelpGenieSheet.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/components/KeyboardAwareScrollViewCompat.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/components/StagingBanner.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/components/StatusBadge.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/constants/colors.ts` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/contexts/language-context.tsx` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/eas.json` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/hooks/useColors.ts` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/lib/api-base-url.ts` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/lib/notifications.ts` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/lib/rn-form-data.ts` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/lib/stream.ts` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/lib/tokenCache.ts` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/metro.config.js` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/package.json` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/scripts/build.js` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/server/serve.js` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/server/templates/landing-page.html` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mobile/tsconfig.json` | Expo mobile application source, configuration, or static asset. |
| `artifacts/mockup-sandbox/.replit-artifact/artifact.toml` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/components.json` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/index.html` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/mockupPreviewPlugin.ts` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/package.json` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/public/sc100_coordinate_mockup.html` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/public/scg-logo.png` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/.generated/mockup-components.ts` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/App.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/assets/sc100_hq-1.png` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/assets/sc100_hq-2.png` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/assets/sc100_hq-3.png` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/assets/sc100_hq-4.png` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/SC100CoordsMockup.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/TextColorComparison.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/case-header/CaseHeader.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/chat-expand/ExpandIcon.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/chat-expand/FullscreenOverlay.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/chat-expand/SlideUpSheet.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/footer/FooterWithSocial.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/forms-wizard/FormsWizard.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/step-nav/VariantA.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/step-nav/VariantB.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/step-nav/VariantC.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/step-nav/VariantD.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/mockups/video-card/IntakeVideoCard.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/accordion.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/alert-dialog.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/alert.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/aspect-ratio.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/avatar.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/badge.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/breadcrumb.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/button-group.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/button.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/calendar.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/card.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/carousel.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/chart.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/checkbox.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/collapsible.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/command.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/context-menu.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/dialog.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/drawer.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/dropdown-menu.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/empty.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/field.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/form.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/hover-card.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/input-group.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/input-otp.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/input.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/item.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/kbd.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/label.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/menubar.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/navigation-menu.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/pagination.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/popover.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/progress.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/radio-group.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/resizable.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/scroll-area.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/select.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/separator.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/sheet.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/sidebar.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/skeleton.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/slider.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/sonner.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/spinner.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/switch.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/table.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/tabs.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/textarea.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/toast.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/toaster.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/toggle-group.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/toggle.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/components/ui/tooltip.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/hooks/use-mobile.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/hooks/use-toast.ts` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/index.css` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/lib/utils.ts` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/src/main.tsx` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/tsconfig.json` | Development-only component-preview sandbox source or asset. |
| `artifacts/mockup-sandbox/vite.config.ts` | Development-only component-preview sandbox source or asset. |
| `artifacts/small-claims-genie/.replit-artifact/artifact.toml` | Tracked project file. |
| `artifacts/small-claims-genie/components.json` | Application configuration or structured reference data. |
| `artifacts/small-claims-genie/eslint.config.js` | Tracked project file. |
| `artifacts/small-claims-genie/index.html` | Tracked HTML reference or preview artifact. |
| `artifacts/small-claims-genie/package.json` | Application configuration or structured reference data. |
| `artifacts/small-claims-genie/prerender.mjs` | Tracked project file. |
| `artifacts/small-claims-genie/public/SmallClaimsGenie-Investor-Spec.docx` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/audio-playback-worklet.js` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/bottle.jpg` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/favicon.svg` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/logo.jpg` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/opengraph.jpg` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/robots.txt` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/sc104-form.pdf` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/sc104-page1.png` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/sc104-page2.png` | Primary web application static asset. |
| `artifacts/small-claims-genie/public/sitemap.xml` | Primary web application static asset. |
| `artifacts/small-claims-genie/server.mjs` | Tracked project file. |
| `artifacts/small-claims-genie/src/App.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/contact-dialog.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/draft-overlay.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/form-wizard-stepper.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/genie-modal.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/help-genie-widget.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/layout.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/sign-up-modal.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/accordion.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/alert-dialog.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/alert.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/aspect-ratio.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/avatar.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/badge.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/breadcrumb.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/button-group.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/button.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/calendar.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/card.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/carousel.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/chart.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/checkbox.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/collapsible.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/command.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/context-menu.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/dialog.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/drawer.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/dropdown-menu.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/empty.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/field.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/form.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/hover-card.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/input-group.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/input-otp.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/input.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/item.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/kbd.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/label.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/menubar.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/navigation-menu.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/pagination.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/popover.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/progress.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/radio-group.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/resizable.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/scroll-area.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/select.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/separator.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/sheet.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/sidebar.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/skeleton.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/slider.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/sonner.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/spinner.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/switch.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/table.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/tabs.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/textarea.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/toast.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/toaster.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/toggle-group.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/toggle.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/ui/tooltip.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/components/workspace-layout.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/contexts/language-context.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/forms/sc112a/sc112a-form-model.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/hooks/use-mobile.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/hooks/use-toast.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/hooks/usePurchaseStatus.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/index.css` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/lib/case-story-ai.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/lib/gtag.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/lib/i18n.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/lib/state-resources.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/lib/types.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/lib/utils.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/lib/workspace-steps.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/main.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/.beta.tsx.gQYwFBI5bHDEd_aitE3EU~` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/account.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/beta-landing.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/beta.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/blog-article.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/blog.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/efile-serve-page.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/new.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/SC104PdfModal.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/chat-tab.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/deadline-calculator-tab.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/demand-letter-tab.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/documents-tab.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections/arizona-forms-section.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections/florida-forms-section.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections/illinois-forms-section.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections/new-jersey-forms-section.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections/north-carolina-forms-section.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections/texas-forms-section.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections/virginia-forms-section.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections/washington-forms-section.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/hearing-prep-tab.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/intake-step-1.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/intake-step-2.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/intake-step-3.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/intake-step-4.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/intake-step-5.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/intake-step-6.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/intake-step-7.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/intake-tab.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/sc104-utils.ts` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/tabs/shared.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/cases/workspace.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/copyright.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/counties.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/dashboard.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/download.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/email-schedule.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/faq.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/how-it-works.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/landing.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/not-found.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/payment-terms.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/podcast-page.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/pricing.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/resources.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/resume.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/sc100-generator.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/sign-in.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/sign-up.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/start.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/terms.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/tos.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/src/pages/types-of-cases.tsx` | Primary React web application source implementation. |
| `artifacts/small-claims-genie/tsconfig.json` | Application configuration or structured reference data. |
| `artifacts/small-claims-genie/vite.config.ts` | TypeScript source or configuration. |
| `backup-to-new-repo.sh` | Shell utility script. |
| `lib/api-client-react/package.json` | Shared generated React API client source. |
| `lib/api-client-react/src/custom-fetch.ts` | Shared generated React API client source. |
| `lib/api-client-react/src/generated/api.schemas.ts` | Shared generated React API client source. |
| `lib/api-client-react/src/generated/api.ts` | Shared generated React API client source. |
| `lib/api-client-react/src/index.ts` | Shared generated React API client source. |
| `lib/api-client-react/tsconfig.json` | Shared generated React API client source. |
| `lib/api-spec/openapi.yaml` | OpenAPI specification, code-generation, or generated API contract source. |
| `lib/api-spec/orval.config.ts` | OpenAPI specification, code-generation, or generated API contract source. |
| `lib/api-spec/package.json` | OpenAPI specification, code-generation, or generated API contract source. |
| `lib/api-spec/postprocess-react-query.cjs` | OpenAPI specification, code-generation, or generated API contract source. |
| `lib/api-zod/package.json` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/api.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/apiError.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/case.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/caseGuidedIntakeData.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/caseGuidedIntakeDataGuidedAnswers.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/caseJurisdictionState.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/caseReadiness.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/caseStats.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/caseStatsByStatus.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/caseStatus.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/caseWithDetails.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/chatMessage.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/chatMessageRole.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/county.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/countyState.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/createCaseBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/createCaseBodyJurisdictionState.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/createOpenaiConversationBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/document.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/documentOcrStatus.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/generateOpenaiImageBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/generateOpenaiImageBodySize.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/generateOpenaiImageResponse.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/healthStatus.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/index.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/listCountiesParams.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/listCountiesState.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/openaiConversation.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/openaiConversationWithMessages.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/openaiError.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/openaiMessage.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/saveIntakeBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/saveIntakeBodyData.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/sc100Preview.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/sendChatMessageBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/sendOpenaiMessageBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/sendOpenaiVoiceMessageBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/updateCaseBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/updateCaseBodyJurisdictionState.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/updateDocumentBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/generated/types/uploadDocumentBody.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/src/index.ts` | Shared generated Zod API validation source. |
| `lib/api-zod/tsconfig.json` | Shared generated Zod API validation source. |
| `lib/db/drizzle.config.ts` | Shared database client, schema, or Drizzle configuration. |
| `lib/db/migrations/add_efile_court_locations_unique_index.sql` | Checked-in database schema change script. |
| `lib/db/migrations/add_jurisdiction_state.sql` | Checked-in database schema change script. |
| `lib/db/migrations/add_mc030_declaration_text.sql` | Checked-in database schema change script. |
| `lib/db/package.json` | Shared database client, schema, or Drizzle configuration. |
| `lib/db/src/index.ts` | Shared database client, schema, or Drizzle configuration. |
| `lib/db/src/schema/ai_rate_limits.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/beta_access.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/cases.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/chat_messages.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/conversations.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/counties.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/documents.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/download_tokens.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/efile_court_locations.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/efile_submissions.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/genie_conversions.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/index.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/messages.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/src/schema/purchases.ts` | Drizzle PostgreSQL schema definition. |
| `lib/db/tsconfig.json` | Shared database client, schema, or Drizzle configuration. |
| `lib/form-signatures/package.json` | Shared signed-form coordinate source and related validation data. |
| `lib/form-signatures/src/index.ts` | Shared signed-form coordinate source and related validation data. |
| `lib/form-signatures/tsconfig.json` | Shared signed-form coordinate source and related validation data. |
| `lib/integrations-openai-ai-react/package.json` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/src/audio/audio-playback-worklet.js` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/src/audio/audio-utils.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/src/audio/index.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/src/audio/useAudioPlayback.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/src/audio/useVoiceRecorder.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/src/audio/useVoiceStream.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/src/audio/useWebSpeech.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/src/index.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-react/tsconfig.json` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/package.json` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/src/audio/client.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/src/audio/index.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/src/batch/index.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/src/batch/utils.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/src/client.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/src/image/client.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/src/image/index.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/src/index.ts` | Shared OpenAI integration client source for server or React usage. |
| `lib/integrations-openai-ai-server/tsconfig.json` | Shared OpenAI integration client source for server or React usage. |
| `lib/state-facts/package.json` | Shared state-specific legal facts and types. |
| `lib/state-facts/src/index.ts` | Shared state-specific legal facts and types. |
| `lib/state-facts/tsconfig.json` | Shared state-specific legal facts and types. |
| `package.json` | Root pnpm workspace package scripts and dependencies. |
| `pnpm-lock.yaml` | Locked dependency graph for reproducible pnpm installs. |
| `pnpm-workspace.yaml` | pnpm workspace membership and shared dependency catalog. |
| `push.sh` | Shell utility script. |
| `replit.md` | Project architecture, operating guidance, and team conventions. |
| `replit.nix` | Replit Nix system-package configuration. |
| `setup-replit.sh` | Replit-only setup script (installs deps, checks secrets, pushes Drizzle schema; does NOT import the database — see RESTORE.md). |
| `sc100_coordinate_mockup.html` | Tracked HTML reference or preview artifact. |
| `scripts/archive-source.sh` | Script workspace configuration or source-archive utility. |
| `scripts/generate-review-doc.mjs` | Script workspace configuration or source-archive utility. |
| `scripts/package.json` | Script workspace configuration or source-archive utility. |
| `scripts/post-merge.sh` | Script workspace configuration or source-archive utility. |
| `scripts/smoke-test.sh` | Script workspace configuration or source-archive utility. |
| `scripts/src/check-fl-sig-placement.ts` | Development, regression, or form-validation script source. |
| `scripts/src/check-state-completeness.ts` | Development, regression, or form-validation script source. |
| `scripts/src/diag-fee-waiver.ts` | Development, regression, or form-validation script source. |
| `scripts/src/form-check-visual.ts` | Development, regression, or form-validation script source. |
| `scripts/src/fw-field-check.ts` | Development, regression, or form-validation script source. |
| `scripts/src/gen-fw-visual.ts` | Development, regression, or form-validation script source. |
| `scripts/src/gen-summons-visual.ts` | Development, regression, or form-validation script source. |
| `scripts/src/hello.ts` | Development, regression, or form-validation script source. |
| `scripts/src/seed-counties.ts` | Development, regression, or form-validation script source. |
| `scripts/src/seed-products.ts` | Development, regression, or form-validation script source. |
| `scripts/src/signed-form-configs.ts` | Development, regression, or form-validation script source. |
| `scripts/src/signed-form-test-kit.ts` | Development, regression, or form-validation script source. |
| `scripts/src/stripeClient.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-az-complaint-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-az-court-line-validation.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-az-fee-waiver-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-az-proof-of-service-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-az-summons-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-broward-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-broward-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-broward-summons-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-broward-summons-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-cl219-volusia-pdf-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-cl219-volusia-pdf.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-cl219-volusia-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-cl219-volusia-soc-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-clkct333-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-clkct423-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-county-forms-extended.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-county-forms.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-fee-waiver-inspect.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-fee-waiver-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-fee-waiver.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-hillsborough-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-hillsborough-soc-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-hillsborough-summons-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-hillsborough-summons-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-hillsborough.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-orange-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-orange-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-orange-summons-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-orange-summons-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-orange.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-palm-beach-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-palm-beach-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-palm-beach-summons-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-palm-beach-summons-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-plain-soc-orange-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-plain-soc-orange.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-proof-of-service-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-proof-of-service.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-7330-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-7331-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-7332-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-7333-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-7334-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-7335-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-7336-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-7337-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-hillsborough-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-soc-hillsborough.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-statement-of-claim-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-summons-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-summons-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-volusia-summons-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-fl-volusia-summons-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-help-chat-mode-b.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-il-fee-waiver-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-il-fee-waiver.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-il-proof-of-service-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-il-proof-of-service.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-il-smc-complaint-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-il-smc-complaint.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-il-summons-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-il-summons.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-mc030-ai.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-mc030.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-nc-aoc-cvm-100-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-nc-aoc-cvm-200-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-nc-aoc-g-106-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-nc-form.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-nc-wa-signed-forms.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-nj-complaint-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-nj-mv-complaint.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-nj-wa-forms.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-sc100.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-sc103-primary.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-sc103-secondary.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-citation-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-citation.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-fee-waiver-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-fee-waiver.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-petition-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-petition-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-petition.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-return-of-service-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-tx-return-of-service.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-va-dc-402-signed.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-va-dc-409-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-va-forms.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-wa-notice-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/test-wa-service-sigcheck.ts` | Development, regression, or form-validation script source. |
| `scripts/src/update-prices.ts` | Development, regression, or form-validation script source. |
| `scripts/src/validate-form-fields.ts` | Development, regression, or form-validation script source. |
| `scripts/src/verify-petition-amount.ts` | Development, regression, or form-validation script source. |
| `scripts/tsconfig.json` | Script workspace configuration or source-archive utility. |
| `small-claims-genie-db.sql` | SQL schema or reference script. |
| `small-claims-genie-security-review.docx` | Tracked project document asset. |
| `threat_model.md` | Project documentation. |
| `tsconfig.base.json` | Shared TypeScript compiler configuration. |
| `tsconfig.json` | Root TypeScript project references. |
| `tsconfig.libs-server.json` | Server-library TypeScript build configuration. |

| `BACKUP_MANIFEST.md` | Exhaustive tracked and pending-backup file inventory generated from Git. |

## Non-ignored workspace items

No non-ignored workspace files remained when this manifest was finalized. The
downloadable ZIP is intentionally ignored because it is a generated delivery
artifact; rerun `bash scripts/archive-source.sh` to recreate it.

- None.

## Ignored workspace content (not repository source)

The following categories exist or may exist in the workspace but are intentionally excluded from Git. They are not omitted accidentally; restore or export them only when the stated reason applies.

| Category | Why it is not committed |
| --- | --- |
| `node_modules/` | installed dependencies recreated by pnpm install |
| `**/dist/` | generated build output recreated by package build commands |
| `.cache/, .config/, .local/, .pythonlibs/, .upm/` | Replit or local tool state, caches, and agent/runtime metadata |
| `attached_assets/` | uploaded chat/research assets, not application source, except the one web-logo file explicitly included by the Docker and source-archive processes |
| `screenshots/` | local visual-test output, not application source |
| `*.zip, *.tar.*, backups/` | local backup archives intentionally excluded to avoid repository bloat |
| `artifacts/api-server/assets/backups/` | generated server backup archives intentionally excluded from Git |
| `*.dump, *.backup, *.sql.gz, database-data*/` | database data exports intentionally excluded to protect data and avoid large commits |
| `.env and .env.* except .env.example` | credentials and host-specific configuration intentionally excluded from Git |

## Version-control verification

Run these commands before handing the backup to another operator:

```bash
git status --short --untracked-files=all
git ls-files | wc -l
git check-ignore -v .env sample.dump database-data/example.sql || true
```

The source workspace was clean before this backup documentation was generated:
it had 1,499 tracked files and zero non-ignored untracked files. The finalized
portable-backup source tree contains 1,510 repository files; the separately
generated source archive adds the one required, otherwise ignored, web-logo
attachment.
