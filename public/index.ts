/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { PluginInitializerContext } from "kibana/public";
import { IndexManagementPlugin } from "./plugin";
import { CreateIndexManagementArgs, IndexManagementApp } from "./index_management";

export interface IndexManagementPluginSetup {
  register: (indexManagement: CreateIndexManagementArgs) => IndexManagementApp;
}
export interface IndexManagementPluginStart {}

export function plugin(initializerContext: PluginInitializerContext) {
  return new IndexManagementPlugin(initializerContext, new Map<string, IndexManagementApp>());
}
