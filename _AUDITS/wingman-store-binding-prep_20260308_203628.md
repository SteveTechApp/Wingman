# Wingman Store Binding Prep

Generated: 20260308_203628

## Likely store files

### _RESCUE\Bundle03_Persistence_20260304_195947\src\features\projects\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectProposal = {`
- `export type ProjectCatalogSelection = {`
- `export type ProjectRecord = {`
- `export function touchProjects(): void {`
- `export function getProjectsTick(): string {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`
- `export function updateProjectProposal(`
- `export function updateProjectCatalogSelection(`

### _RESCUE\Bundle1WorkflowFixes_20260306_193953\projectStore.ts
- `export type DiscoveryProductFamily =`
- `export type ProjectDiscovery = {`
- `export type ProjectCatalog = {`
- `export type ProjectProposal = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProjectId(id: string): void {`
- `export function getActiveProject(): StoredProject | undefined {`
- `export function ensureActiveProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProjectDiscovery(`

### _RESCUE\Bundle3EditableProjectWorkspace_20260306_195455\projectStore.ts
- `export type DiscoveryProductFamily =`
- `export type ProjectDiscovery = {`
- `export type ProjectCatalog = {`
- `export type ProjectProposal = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProjectId(id: string): void {`
- `export function getActiveProject(): StoredProject | undefined {`
- `export function ensureActiveProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProjectDiscovery(`

### _RESCUE\Bundle6TemplateBuilder_20260306_201615\projectStore.ts
- `export type DiscoveryProductFamily =`
- `export type ProjectDiscovery = {`
- `export type ProjectCatalog = {`
- `export type ProjectProposal = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function updateProjectFields(`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProjectId(id: string): void {`
- `export function getActiveProject(): StoredProject | undefined {`
- `export function ensureActiveProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProjectDiscovery(`

### _RESCUE\Bundle7VideoWallWizard_20260306_202003\projectStore.ts
- `export type DiscoveryProductFamily =`
- `export type ProjectTemplateTier = "Bronze" | "Silver" | "Gold";`
- `export type ProjectTemplateContext = {`
- `export type ProjectDiscovery = {`
- `export type ProjectCatalog = {`
- `export type ProjectProposal = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function updateProjectFields(`
- `export function applyProjectTemplate(`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProjectId(id: string): void {`
- `export function getActiveProject(): StoredProject | undefined {`

### _RESCUE\Bundle8CompetitorCompare_20260306_202528\projectStore.ts
- `export type DiscoveryProductFamily =`
- `export type ProjectTemplateTier = "Bronze" | "Silver" | "Gold";`
- `export type VideoWallTechnology = "LCD" | "LED";`
- `export type ProjectTemplateContext = {`
- `export type ProjectVideoWall = {`
- `export type ProjectDiscovery = {`
- `export type ProjectCatalog = {`
- `export type ProjectProposal = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function updateProjectFields(`
- `export function applyProjectTemplate(`
- `export function applyVideoWallToProject(`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`

### _RESCUE\CatalogSaveSelection_20260304_173207\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectProposal = {`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`
- `export function updateProjectProposal(`

### _RESCUE\CatalogSaveSelection_20260304_173235\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectProposal = {`
- `export type ProjectCatalogSelection = {`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`
- `export function updateProjectProposal(`
- `export function updateProjectCatalogSelection(`

### _RESCUE\EncodingFix_20260305_210016\src\auth\authStore.ts
- `export type LocalAuthUser = { email: string; name?: string };`
- `export type AuthState = { user: LocalAuthUser; remember?: boolean };`
- `export function getAnyAuth(): AuthState | null {`
- `export function loginLocal(user: LocalAuthUser, remember = true): AuthState {`
- `export function logout(): void {`

### _RESCUE\EncodingFix_20260305_210016\src\competitor\CompetitorStore.ts
- `export function loadCompetitors(): CompetitorItem[]{`
- `export function saveCompetitors(items: CompetitorItem[]){ localStorage.setItem(KEY, JSON.stringify(items, null, 2)); }`
- `export function resetCompetitors(){ localStorage.removeItem(KEY); }`

### _RESCUE\EncodingFix_20260305_210016\src\features\ai\guru\guruStore.ts
- `export type GuruState = {`
- `export function useGuruState() {`
- `export function buildGuruContext(mode: GuruMode, extra?: Partial<GuruContext>): GuruContext {`

### _RESCUE\EncodingFix_20260305_210016\src\features\discovery\discoveryStore.ts
- `export type DiscoveryProductFamily =`
- `export type DiscoveryRecord = {`
- `export function emptyDiscoveryRecord(): DiscoveryRecord {`
- `export function saveDiscoveryRecord(record: DiscoveryRecord): void {`
- `export function loadDiscoveryRecord(): DiscoveryRecord | null {`
- `export function clearDiscoveryRecord(): void {`
- `export function recommendFamilies(input: {`

### _RESCUE\EncodingFix_20260305_210016\src\features\projects\projectDraftStore.ts
- `export type ProjectStatus = "draft" | "active" | "archived";`
- `export type TierId = "bronze" | "silver" | "gold";`
- `export type TemplateSeed = {`
- `export type ProjectBrief = {`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getActiveProjectId(): string | null {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(projectId: string): void {`
- `export function deleteProject(projectId: string): void {`
- `export function upsertProject(project: ProjectRecord): void {`
- `export function updateProjectBrief(`
- `export function createProjectFromTemplateSeed(): ProjectRecord | null {`
- `export function importProjects(rawJson: string): {`
- `export function getActiveProjectContext(): LegacyProjectContext | null {`
- `export function updateActiveProjectBrief(`
- `export function updateProjectStatus(`
- `export function updateActiveProjectStatus(`

### _RESCUE\EncodingFix_20260305_210016\src\features\projects\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectProposal = {`
- `export type ProjectCatalogSelection = {`
- `export type ProjectRecord = {`
- `export function touchProjects(): void {`
- `export function getProjectsTick(): string {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`
- `export function updateProjectProposal(`
- `export function updateProjectCatalogSelection(`

### _RESCUE\EncodingFix_20260305_210016\src\proposal\bom\store.ts
- `export function useProposalStore() {`
- `export { addLineToSavedProposal };`

### _RESCUE\EncodingFix_20260305_210016\src\services\database\ProjectStore.ts
- `export class ProjectStore extends DatabaseService {`

### _RESCUE\EncodingFix_20260305_210016\src\services\database\TemplateStore.ts
- `export class TemplateStore extends DatabaseService {`

### _RESCUE\EncodingFix_20260305_210016\src\state\app\projectsStore.ts
- `export * from "@/state/projectsStore";`

### _RESCUE\EncodingFix_20260305_210016\src\state\projectsStore.ts
- `export type ProjectRecord = {`
- `export function subscribeProjects(listener: () => void) {`
- `export function getProjectsState(): StoreState {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(id: string | null) {`
- `export function createProject(name: string): ProjectRecord {`
- `export function renameProject(id: string, name: string) {`
- `export function deleteProject(id: string) {`
- `export function touchActiveProject() {`

### _RESCUE\EncodingFix_20260305_210016\src\state\userStore.ts
- `export const defaultUserState: UserProfile = {`

### _RESCUE\EncodingFix_20260305_210016\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`
- `export const subscribe = subscribeWingman;`

### _RESCUE\EncodingFix_20260305_210211\src\auth\authStore.ts
- `export type LocalAuthUser = { email: string; name?: string };`
- `export type AuthState = { user: LocalAuthUser; remember?: boolean };`
- `export function getAnyAuth(): AuthState | null {`
- `export function loginLocal(user: LocalAuthUser, remember = true): AuthState {`
- `export function logout(): void {`

### _RESCUE\EncodingFix_20260305_210211\src\competitor\CompetitorStore.ts
- `export function loadCompetitors(): CompetitorItem[]{`
- `export function saveCompetitors(items: CompetitorItem[]){ localStorage.setItem(KEY, JSON.stringify(items, null, 2)); }`
- `export function resetCompetitors(){ localStorage.removeItem(KEY); }`

### _RESCUE\EncodingFix_20260305_210211\src\features\ai\guru\guruStore.ts
- `export type GuruState = {`
- `export function useGuruState() {`
- `export function buildGuruContext(mode: GuruMode, extra?: Partial<GuruContext>): GuruContext {`

### _RESCUE\EncodingFix_20260305_210211\src\features\discovery\discoveryStore.ts
- `export type DiscoveryProductFamily =`
- `export type DiscoveryRecord = {`
- `export function emptyDiscoveryRecord(): DiscoveryRecord {`
- `export function saveDiscoveryRecord(record: DiscoveryRecord): void {`
- `export function loadDiscoveryRecord(): DiscoveryRecord | null {`
- `export function clearDiscoveryRecord(): void {`
- `export function recommendFamilies(input: {`

### _RESCUE\EncodingFix_20260305_210211\src\features\projects\projectDraftStore.ts
- `export type ProjectStatus = "draft" | "active" | "archived";`
- `export type TierId = "bronze" | "silver" | "gold";`
- `export type TemplateSeed = {`
- `export type ProjectBrief = {`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getActiveProjectId(): string | null {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(projectId: string): void {`
- `export function deleteProject(projectId: string): void {`
- `export function upsertProject(project: ProjectRecord): void {`
- `export function updateProjectBrief(`
- `export function createProjectFromTemplateSeed(): ProjectRecord | null {`
- `export function importProjects(rawJson: string): {`
- `export function getActiveProjectContext(): LegacyProjectContext | null {`
- `export function updateActiveProjectBrief(`
- `export function updateProjectStatus(`
- `export function updateActiveProjectStatus(`

### _RESCUE\EncodingFix_20260305_210211\src\features\projects\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectProposal = {`
- `export type ProjectCatalogSelection = {`
- `export type ProjectRecord = {`
- `export function touchProjects(): void {`
- `export function getProjectsTick(): string {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`
- `export function updateProjectProposal(`
- `export function updateProjectCatalogSelection(`

### _RESCUE\EncodingFix_20260305_210211\src\proposal\bom\store.ts
- `export function useProposalStore() {`
- `export { addLineToSavedProposal };`

### _RESCUE\EncodingFix_20260305_210211\src\services\database\ProjectStore.ts
- `export class ProjectStore extends DatabaseService {`

### _RESCUE\EncodingFix_20260305_210211\src\services\database\TemplateStore.ts
- `export class TemplateStore extends DatabaseService {`

### _RESCUE\EncodingFix_20260305_210211\src\state\app\projectsStore.ts
- `export * from "@/state/projectsStore";`

### _RESCUE\EncodingFix_20260305_210211\src\state\projectsStore.ts
- `export type ProjectRecord = {`
- `export function subscribeProjects(listener: () => void) {`
- `export function getProjectsState(): StoreState {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(id: string | null) {`
- `export function createProject(name: string): ProjectRecord {`
- `export function renameProject(id: string, name: string) {`
- `export function deleteProject(id: string) {`
- `export function touchActiveProject() {`

### _RESCUE\EncodingFix_20260305_210211\src\state\userStore.ts
- `export const defaultUserState: UserProfile = {`

### _RESCUE\EncodingFix_20260305_210211\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`
- `export const subscribe = subscribeWingman;`

### _RESCUE\FixComparisonStartNew_20260305_205500\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`
- `export const subscribe = subscribeWingman;`

### _RESCUE\FixWingmanActions_20260305_205117\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`
- `export const subscribe = subscribeWingman;`

### _RESCUE\FixWingmanStoreProductDup_20260305_205825\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`
- `export const subscribe = subscribeWingman;`

### _RESCUE\LiveProjectsWireUp_20260306_180904\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectProposal = {`
- `export type ProjectCatalogSelection = {`
- `export type ProjectRecord = {`
- `export function touchProjects(): void {`
- `export function getProjectsTick(): string {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`
- `export function updateProjectProposal(`
- `export function updateProjectCatalogSelection(`

### _RESCUE\PhaseNextBundle04_20260304_191533\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectProposal = {`
- `export type ProjectCatalogSelection = {`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`
- `export function updateProjectProposal(`
- `export function updateProjectCatalogSelection(`

### _RESCUE\ProjectAdapterProposalFix_20260304_060308\src\features\projects\projectDraftStore.ts
- `export type ProjectStatus = "draft" | "active" | "archived";`
- `export type TierId = "bronze" | "silver" | "gold";`
- `export type TemplateSeed = {`
- `export type ProjectBrief = {`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getActiveProjectId(): string | null {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(projectId: string): void {`
- `export function deleteProject(projectId: string): void {`
- `export function upsertProject(project: ProjectRecord): void {`
- `export function updateProjectBrief(`
- `export function createProjectFromTemplateSeed(): ProjectRecord | null {`
- `export function importProjects(rawJson: string): {`
- `export function getActiveProjectContext(): LegacyProjectContext | null {`
- `export function updateActiveProjectBrief(`
- `export function updateProjectStatus(`
- `export function updateActiveProjectStatus(`

### _RESCUE\ProjectStore_RemoveDuplicateShim_20260306_203836\projectStore.ts
- `export type DiscoveryProductFamily =`
- `export type ProjectTemplateTier = "Bronze" | "Silver" | "Gold";`
- `export type VideoWallTechnology = "LCD" | "LED";`
- `export type CompareConfidence = "High" | "Medium" | "Low";`
- `export type ProjectTemplateContext = {`
- `export type ProjectVideoWall = {`
- `export type ProjectCompareRecord = {`
- `export type ProjectDiscovery = {`
- `export type ProjectCatalog = {`
- `export type ProjectProposal = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function applyCompareToProject(`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`

### _RESCUE\ProjectStoreCompatFix_20260306_181323\projectStore.ts
- `export type StoredProject = {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`

### _RESCUE\ProjectStoreCompatFix_20260306_181729\projectStore.ts
- `export type StoredProject = {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`

### _RESCUE\ProjectStoreCompatFix_20260306_181813\projectStore.ts
- `export type ProjectDiscovery = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProjectId(id: string): void {`
- `export function getActiveProject(): StoredProject | undefined {`
- `export function ensureActiveProject(): StoredProject {`
- `export function updateProjectDiscovery(projectId: string, discoveryPatch: Partial<ProjectDiscovery>): StoredProject | undefined {`

### _RESCUE\ProjectStoreCompatFix2_20260306_182150\projectStore.ts
- `export type ProjectDiscovery = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProjectId(id: string): void {`
- `export function getActiveProject(): StoredProject | undefined {`
- `export function ensureActiveProject(): StoredProject {`
- `export function updateProjectDiscovery(projectId: string, discoveryPatch: Partial<ProjectDiscovery>): StoredProject | undefined {`

### _RESCUE\ProjectStoreMissingExportsFix_20260306_202744\projectStore.ts
- `export type DiscoveryProductFamily =`
- `export type ProjectTemplateTier = "Bronze" | "Silver" | "Gold";`
- `export type VideoWallTechnology = "LCD" | "LED";`
- `export type CompareConfidence = "High" | "Medium" | "Low";`
- `export type ProjectTemplateContext = {`
- `export type ProjectVideoWall = {`
- `export type ProjectCompareRecord = {`
- `export type ProjectDiscovery = {`
- `export type ProjectCatalog = {`
- `export type ProjectProposal = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function applyCompareToProject(`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`

### _RESCUE\ProposalSaveToProject_20260304_172541\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`

### _RESCUE\ReactImportNormalize_20260305_151548\src\auth\authStore.ts
- `export type LocalAuthUser = { email: string; name?: string };`
- `export type AuthState = { user: LocalAuthUser; remember?: boolean };`
- `export function getAnyAuth(): AuthState | null {`
- `export function loginLocal(user: LocalAuthUser, remember = true): AuthState {`
- `export function logout(): void {`

### _RESCUE\ReactImportNormalize_20260305_151548\src\competitor\CompetitorStore.ts
- `export function loadCompetitors(): CompetitorItem[]{`
- `export function saveCompetitors(items: CompetitorItem[]){ localStorage.setItem(KEY, JSON.stringify(items, null, 2)); }`
- `export function resetCompetitors(){ localStorage.removeItem(KEY); }`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\ai\guru\guruStore.ts
- `export type GuruState = {`
- `export function useGuruState() {`
- `export function buildGuruContext(mode: GuruMode, extra?: Partial<GuruContext>): GuruContext {`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\discovery\discoveryStore.ts
- `export type DiscoveryProductFamily =`
- `export type DiscoveryRecord = {`
- `export function emptyDiscoveryRecord(): DiscoveryRecord {`
- `export function saveDiscoveryRecord(record: DiscoveryRecord): void {`
- `export function loadDiscoveryRecord(): DiscoveryRecord | null {`
- `export function clearDiscoveryRecord(): void {`
- `export function recommendFamilies(input: {`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\projects\projectDraftStore.ts
- `export type ProjectStatus = "draft" | "active" | "archived";`
- `export type TierId = "bronze" | "silver" | "gold";`
- `export type TemplateSeed = {`
- `export type ProjectBrief = {`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getActiveProjectId(): string | null {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(projectId: string): void {`
- `export function deleteProject(projectId: string): void {`
- `export function upsertProject(project: ProjectRecord): void {`
- `export function updateProjectBrief(`
- `export function createProjectFromTemplateSeed(): ProjectRecord | null {`
- `export function importProjects(rawJson: string): {`
- `export function getActiveProjectContext(): LegacyProjectContext | null {`
- `export function updateActiveProjectBrief(`
- `export function updateProjectStatus(`
- `export function updateActiveProjectStatus(`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\projects\projectStore.ts
- `export type ProjectStatus =`
- `export type ProjectProposal = {`
- `export type ProjectCatalogSelection = {`
- `export type ProjectRecord = {`
- `export function touchProjects(): void {`
- `export function getProjectsTick(): string {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getProjectById(id: string): ProjectRecord | null {`
- `export function getActiveProjectId(): string | null {`
- `export function setActiveProject(id: string): void {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function deriveProjectName(seed?: {`
- `export function createProject(`
- `export function updateProject(`
- `export function ensureActiveProject(seed?: {`
- `export function updateProjectDiscovery(`
- `export function updateProjectProposal(`
- `export function updateProjectCatalogSelection(`

### _RESCUE\ReactImportNormalize_20260305_151548\src\proposal\bom\store.ts
- `export function useProposalStore() {`
- `export { addLineToSavedProposal };`

### _RESCUE\ReactImportNormalize_20260305_151548\src\services\database\ProjectStore.ts
- `export class ProjectStore extends DatabaseService {`

### _RESCUE\ReactImportNormalize_20260305_151548\src\services\database\TemplateStore.ts
- `export class TemplateStore extends DatabaseService {`

### _RESCUE\ReactImportNormalize_20260305_151548\src\state\app\projectsStore.ts
- `export * from "@/state/projectsStore";`

### _RESCUE\ReactImportNormalize_20260305_151548\src\state\projectsStore.ts
- `export type ProjectRecord = {`
- `export function subscribeProjects(listener: () => void) {`
- `export function getProjectsState(): StoreState {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(id: string | null) {`
- `export function createProject(name: string): ProjectRecord {`
- `export function renameProject(id: string, name: string) {`
- `export function deleteProject(id: string) {`
- `export function touchActiveProject() {`

### _RESCUE\TemplateRenderPatch_20260303_202524\src\auth\authStore.ts
- `export type LocalAuthUser = { email: string; name?: string };`
- `export type AuthState = { user: LocalAuthUser; remember?: boolean };`
- `export function getAnyAuth(): AuthState | null {`
- `export function loginLocal(user: LocalAuthUser, remember = true): AuthState {`
- `export function logout(): void {`

### _RESCUE\TemplateRenderPatch_20260303_202524\src\competitor\CompetitorStore.ts
- `export function loadCompetitors(): CompetitorItem[]{`
- `export function saveCompetitors(items: CompetitorItem[]){ localStorage.setItem(KEY, JSON.stringify(items)); }`
- `export function resetCompetitors(){ localStorage.removeItem(KEY); }`

### _RESCUE\TemplateRenderPatch_20260303_202524\src\features\ai\guru\guruStore.ts
- `export type GuruState = {`
- `export function useGuruState() {`
- `export function buildGuruContext(mode: GuruMode, extra?: Partial<GuruContext>): GuruContext {`

### _RESCUE\TemplateRenderPatch_20260303_202524\src\state\projectsStore.ts
- `export type ProjectRecord = {`
- `export function subscribeProjects(listener: () => void) {`
- `export function getProjectsState(): StoreState {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(id: string | null) {`
- `export function createProject(name: string): ProjectRecord {`
- `export function renameProject(id: string, name: string) {`
- `export function deleteProject(id: string) {`
- `export function touchActiveProject() {`

### _RESCUE\WingmanCompatFix_20260305_200454\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`

### _RESCUE\WingmanCompatFix_20260305_200749\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`

### _RESCUE\WingmanSetAuthedFix_20260305_201206\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`

### _RESCUE\WingmanStabilizer_20260305_201900\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`

### _RESCUE\WingmanStabilizer_20260305_203555\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`
- `export const subscribe = subscribeWingman;`

### _RESCUE\WingmanStabilizer_Patch2_20260305_204031\src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`
- `export const subscribe = subscribeWingman;`
- `export const subscribe = subscribeWingman;`

### _RESCUE\WingmanStateLayer_20260305_200042\src\state\wingmanStore.ts
- `export const wingmanStore = createStore(DEFAULT_WINGMAN_STATE);`

### node_modules\@use-gesture\core\src\EventStore.ts
- `export class EventStore {`

### node_modules\@use-gesture\core\src\TimeoutStore.ts
- `export class TimeoutStore {`

### node_modules\react-hot-toast\src\core\store.ts
- `export const TOAST_EXPIRE_DISMISS_DELAY = 1000;`
- `export const TOAST_LIMIT = 20;`
- `export const DEFAULT_TOASTER_ID = 'default';`
- `export enum ActionType {`
- `export type Action =`
- `export const reducer = (state: ToasterState, action: Action): ToasterState => {`
- `export const dispatch = (action: Action, toasterId = DEFAULT_TOASTER_ID) => {`
- `export const dispatchAll = (action: Action) =>`
- `export const getToasterIdFromToastId = (toastId: string) =>`
- `export const createDispatch =`
- `export const defaultTimeouts: {`
- `export const useStore = (`

### src\auth\authStore.ts
- `export type LocalAuthUser = { email: string; name?: string };`
- `export type AuthState = { user: LocalAuthUser; remember?: boolean };`
- `export function getAnyAuth(): AuthState | null {`
- `export function loginLocal(user: LocalAuthUser, remember = true): AuthState {`
- `export function logout(): void {`

### src\competitor\CompetitorStore.ts
- `export function loadCompetitors(): CompetitorItem[]{`
- `export function saveCompetitors(items: CompetitorItem[]){ localStorage.setItem(KEY, JSON.stringify(items, null, 2)); }`
- `export function resetCompetitors(){ localStorage.removeItem(KEY); }`

### src\features\ai\guru\guruStore.ts
- `export type GuruState = {`
- `export function useGuruState() {`
- `export function buildGuruContext(mode: GuruMode, extra?: Partial<GuruContext>): GuruContext {`

### src\features\discovery\discoveryStore.ts
- `export type DiscoveryProductFamily =`
- `export type DiscoveryRecord = {`
- `export function emptyDiscoveryRecord(): DiscoveryRecord {`
- `export function saveDiscoveryRecord(record: DiscoveryRecord): void {`
- `export function loadDiscoveryRecord(): DiscoveryRecord | null {`
- `export function clearDiscoveryRecord(): void {`
- `export function recommendFamilies(input: {`

### src\features\projects\projectDraftStore.ts
- `export type ProjectStatus = "draft" | "active" | "archived";`
- `export type TierId = "bronze" | "silver" | "gold";`
- `export type TemplateSeed = {`
- `export type ProjectBrief = {`
- `export type ProjectRecord = {`
- `export function getProjects(): ProjectRecord[] {`
- `export function getActiveProjectId(): string | null {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(projectId: string): void {`
- `export function deleteProject(projectId: string): void {`
- `export function upsertProject(project: ProjectRecord): void {`
- `export function updateProjectBrief(`
- `export function createProjectFromTemplateSeed(): ProjectRecord | null {`
- `export function importProjects(rawJson: string): {`
- `export function getActiveProjectContext(): LegacyProjectContext | null {`
- `export function updateActiveProjectBrief(`
- `export function updateProjectStatus(`
- `export function updateActiveProjectStatus(`

### src\features\projects\projectStore.ts
- `export type DiscoveryProductFamily =`
- `export type ProjectTemplateTier = "Bronze" | "Silver" | "Gold";`
- `export type VideoWallTechnology = "LCD" | "LED";`
- `export type CompareConfidence = "High" | "Medium" | "Low";`
- `export type ProjectTemplateContext = {`
- `export type ProjectVideoWall = {`
- `export type ProjectCompareRecord = {`
- `export type ProjectDiscovery = {`
- `export type ProjectCatalog = {`
- `export type ProjectProposal = {`
- `export type StoredProject = {`
- `export function getProjectsTick(): string {`
- `export function loadProjects(): StoredProject[] {`
- `export function saveProjects(projects: StoredProject[]): void {`
- `export function subscribeProjects(listener: Listener): () => void {`
- `export function createProject(partial?: Partial<StoredProject>): StoredProject {`
- `export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {`
- `export function applyCompareToProject(`
- `export function deleteProject(id: string): void {`
- `export function getProjectById(id: string): StoredProject | undefined {`

### src\features\systemDesign\designBundleStore.ts
- `export const DESIGN_BUNDLE_STORAGE_KEY = "wm_design_bundle_v1";`
- `export function writeDesignBundle(bundle: DesignBundle) {`
- `export function readDesignBundle(): DesignBundle | null {`
- `export function summariseDesignBundle(bundle: DesignBundle): {`
- `export function buildProposalSeedFromBundle(bundle: DesignBundle): {`

### src\proposal\bom\store.ts
- `export function useProposalStore() {`
- `export { addLineToSavedProposal };`

### src\services\database\ProjectStore.ts
- `export class ProjectStore extends DatabaseService {`

### src\services\database\TemplateStore.ts
- `export class TemplateStore extends DatabaseService {`

### src\state\app\projectsStore.ts
- `export * from "@/state/projectsStore";`

### src\state\projectsStore.ts
- `export type ProjectRecord = {`
- `export function subscribeProjects(listener: () => void) {`
- `export function getProjectsState(): StoreState {`
- `export function getActiveProject(): ProjectRecord | null {`
- `export function setActiveProject(id: string | null) {`
- `export function createProject(name: string): ProjectRecord {`
- `export function renameProject(id: string, name: string) {`
- `export function deleteProject(id: string) {`
- `export function touchActiveProject() {`

### src\state\userStore.ts
- `export const defaultUserState: UserProfile = {`

### src\state\wingmanProjectStore.ts
- `export type ProjectSku = {`
- `export function getProjectSkus(): ProjectSku[] {`
- `export function addProjectSku(item: ProjectSku) {`
- `export function clearProjectSkus() {`

### src\state\wingmanStore.ts
- `export function getWingmanState(): WingmanState {`
- `export function setWingmanState(next: WingmanState){`
- `export function patchWingmanState(patch: Partial<WingmanState>){`
- `export function subscribeWingman(listener: () => void){`
- `export const wingmanActions = {`
- `export function useWingman(): WingmanState;`
- `export function useWingman<T>(selector: (s: WingmanState) => T): T;`
- `export function useWingman<T>(selector?: (s: WingmanState) => T){`
- `export const subscribe = subscribeWingman;`

## Likely type files

- _RESCUE\EncodingFix_20260305_210016\src\catalog\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\competitor\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\components\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\core\engineering\rules\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\core\engineering\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\core\models\ValidationTypes.ts
- _RESCUE\EncodingFix_20260305_210016\src\proposal\bom\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\services\auth\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\services\database\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\services\export\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\state\types.ts
- _RESCUE\EncodingFix_20260305_210016\src\utils\cableRouting\types.ts
- _RESCUE\EncodingFix_20260305_210211\src\catalog\types.ts
- _RESCUE\EncodingFix_20260305_210211\src\competitor\types.ts
- _RESCUE\EncodingFix_20260305_210211\src\components\types.ts
- _RESCUE\EncodingFix_20260305_210211\src\core\engineering\rules\types.ts
- _RESCUE\EncodingFix_20260305_210211\src\core\engineering\types.ts
- _RESCUE\EncodingFix_20260305_210211\src\core\models\ValidationTypes.ts
- _RESCUE\EncodingFix_20260305_210211\src\proposal\bom\types.ts
- _RESCUE\EncodingFix_20260305_210211\src\services\auth\types.ts

## Likely catalogue files

- _ARCHIVE\Dedupe_20260305_185814\src\features\misc\ProductCatalogPage.tsx
- _ARCHIVE\Dedupe_20260305_185814\src\features\tools\ProductCatalogPage.tsx
- _RESCUE_CatalogNavFix_20260308_184121\src__features__catalog__catalogIntelligence.ts
- _RESCUE_DataWiring_20260308_111200\src_features_catalog_ProductCatalogPage.tsx
- _RESCUE_NextPass_WorkspacePages_20260308_110907\src_features_catalog_ProductCatalogPage.tsx
- _RESCUE_Wingman_LayoutAndGuru_20260308_102129\src_features_catalog_ProductCatalogPage.tsx
- _RESCUE\Bundle03_Persistence_20260304_195947\src\features\tools\ProductCatalogPage.tsx
- _RESCUE\CatalogFixType_20260304_164123\ProductCatalogPage.tsx
- _RESCUE\CatalogSaveSelection_20260304_173207\ProductCatalogPage.tsx
- _RESCUE\CatalogSaveSelection_20260304_173235\ProductCatalogPage.tsx
- _RESCUE\Dedupe_20260305_185814\src\features\misc\ProductCatalogPage.tsx
- _RESCUE\Dedupe_20260305_185814\src\features\tools\ProductCatalogPage.tsx
- _RESCUE\EncodingFix_20260305_210016\src\catalog\CatalogRepository.ts
- _RESCUE\EncodingFix_20260305_210016\src\catalog\CatalogService.ts
- _RESCUE\EncodingFix_20260305_210016\src\catalog\intelligence\CatalogAdvisor.ts
- _RESCUE\EncodingFix_20260305_210016\src\data\wyrestormSkuCatalog.2026.ts
- _RESCUE\EncodingFix_20260305_210016\src\features\catalog\CatalogPage.tsx
- _RESCUE\EncodingFix_20260305_210016\src\features\catalog\catalogSeed.ts
- _RESCUE\EncodingFix_20260305_210016\src\features\guru\guruCatalog.generated.ts
- _RESCUE\EncodingFix_20260305_210016\src\features\guru\guruCatalog.seed.ts

## Likely project files

- _ARCHIVE\RepoStructureCleanup_Phase21_20260306_084416\src\pages\ProjectsPage.tsx
- _ARCHIVE\RepoStructureCleanup_Phase28_20260306_110756\src\pages\ProjectSetupScreen.tsx
- _RESCUE_DashboardUnified_20260308_100121\src_features_projects_ProjectsPage.tsx
- _RESCUE_DashboardUnified_Fix_20260308_100559\src_features_projects_ProjectsPage.tsx
- _RESCUE_DataWorkflowBundle_20260308_163201\src_core_workflow_projectState.ts
- _RESCUE_GlobalStyleAdoption2_20260308_202038\ProjectsPage.tsx
- _RESCUE_NextPass_WorkspacePages_20260308_110907\src_features_projects_ProjectsPage.tsx
- _RESCUE_RealDataFoundation_20260308_203007\ProjectsPage.tsx
- _RESCUE_RouteIntegrationBundle_20260308_164425\C__Users_steve_wingman_src_app_widgets_LiveProjectStrip.tsx
- _RESCUE_RouteIntegrationBundle_20260308_171203\C__Users_steve_wingman_src_app_widgets_LiveProjectStrip.tsx
- _RESCUE_Wingman_LayoutAndGuru_20260308_102027\src_features_projects_ProjectsPage.tsx
- _RESCUE_Wingman_LayoutAndGuru_20260308_102129\src_features_projects_ProjectsPage.tsx
- _RESCUE\ArchClean_20260305_153943\src\context\ProjectContext.tsx
- _RESCUE\ArchClean_20260305_154009\src\context\ProjectContext.tsx
- _RESCUE\Bundle03_Persistence_20260304_195947\src\features\projects\projectStore.ts
- _RESCUE\Bundle04_PolishAndExport_20260304_200331\src\features\projects\ProjectsPage.tsx
- _RESCUE\Bundle1WorkflowFixes_20260306_193953\ProjectsPage.tsx
- _RESCUE\Bundle1WorkflowFixes_20260306_193953\projectStore.ts
- _RESCUE\Bundle3EditableProjectWorkspace_20260306_195455\ProjectsPage.tsx
- _RESCUE\Bundle3EditableProjectWorkspace_20260306_195455\projectStore.ts

## Likely persistence files

- _RESCUE\EncodingFix_20260305_210016\src\app\storage\useLocalStorage.ts
- _RESCUE\EncodingFix_20260305_210016\src\hooks\useLocalStorage.ts
- _RESCUE\EncodingFix_20260305_210016\src\proposal\bom\persist.ts
- _RESCUE\EncodingFix_20260305_210016\src\services\localizationService.ts
- _RESCUE\EncodingFix_20260305_210211\src\app\storage\useLocalStorage.ts
- _RESCUE\EncodingFix_20260305_210211\src\hooks\useLocalStorage.ts
- _RESCUE\EncodingFix_20260305_210211\src\proposal\bom\persist.ts
- _RESCUE\EncodingFix_20260305_210211\src\services\localizationService.ts
- _RESCUE\ReactImportNormalize_20260305_151548\src\app\storage\useLocalStorage.ts
- _RESCUE\ReactImportNormalize_20260305_151548\src\hooks\useLocalStorage.ts
- _RESCUE\ReactImportNormalize_20260305_151548\src\proposal\bom\persist.ts
- _RESCUE\ReactImportNormalize_20260305_151548\src\services\localizationService.ts
- _RESCUE\TemplateRenderPatch_20260303_202524\src\app\storage\useLocalStorage.ts
- _RESCUE\TemplateRenderPatch_20260303_202524\src\hooks\useLocalStorage.ts
- _RESCUE\TemplateRenderPatch_20260303_202524\src\proposal\bom\persist.ts
- node_modules\@firebase\app-check\dist\esm\src\storage.d.ts
- node_modules\@firebase\app-check\dist\esm\src\storage.test.d.ts
- node_modules\@firebase\app-check\dist\src\storage.d.ts
- node_modules\@firebase\app-check\dist\src\storage.test.d.ts
- node_modules\@firebase\auth-compat\dist\auth-compat\src\persistence.d.ts

## Recommended next binding targets

1. Bind active project name into TopBar
2. Bind project list into ProjectsPage and DashboardPage
3. Bind real catalogue dataset into ProductCataloguePage
4. Bind proposal inputs and outputs to live project state

## Created bridge file

- src\core\wingman\storeBridge.ts

This bridge is currently safe and local-storage backed so it will not break typecheck.
