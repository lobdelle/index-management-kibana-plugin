/*
 * Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import React, { ChangeEvent, Component } from "react";
import { EuiButton, EuiButtonEmpty, EuiComboBoxOptionOption, EuiFlexGroup, EuiFlexItem } from "@elastic/eui";
import { RouteComponentProps } from "react-router-dom";
import moment from "moment";
import { TransformService } from "../../../../services";
import { BREADCRUMBS, ROUTES } from "../../../../utils/constants";
import IndexService from "../../../../services/IndexService";
import { ManagedCatIndex } from "../../../../../server/models/interfaces";
import CreateTransform from "../CreateTransform";
import CreateTransformStep2 from "../CreateTransformStep2";
import { DimensionItem, FieldItem, IndexItem, Transform } from "../../../../../models/interfaces";
import { getErrorMessage } from "../../../../utils/helpers";
import { EMPTY_TRANSFORM } from "../../utils/constants";
import CreateTransformStep3 from "../CreateTransformStep3";
import CreateTransformStep4 from "../CreateTransformStep4";
import { compareFieldItem, parseFieldOptions } from "../../utils/helpers";
import { CoreServicesContext } from "../../../../components/core_services";

interface CreateTransformFormProps extends RouteComponentProps {
  transformService: TransformService;
  indexService: IndexService;
}

interface CreateTransformFormState {
  currentStep: number;
  transformId: string;
  transformIdError: string;
  transformSeqNo: number | null;
  transformPrimaryTerm: number | null;
  submitError: string;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  loadingIndices: boolean;
  indices: ManagedCatIndex[];
  totalIndices: number;

  description: string;
  sourceIndex: { label: string; value?: IndexItem }[];
  sourceIndexError: string;
  targetIndex: { label: string; value?: IndexItem }[];
  targetIndexError: string;

  mappings: any;
  allMappings: FieldItem[][];
  fields: FieldItem[];
  selectedTerms: FieldItem[];

  selectedGroupField: DimensionItem[];
  selectedAggregations: Map<string, any>; // Needs to be Map<string, any>
  aggregationsError: string;
  selectedFields: FieldItem[];
  jobEnabledByDefault: boolean;

  interval: number;
  intervalError: string;
  intervalTimeunit: string;
  pageSize: number;
  transformJSON: any;
}

export default class CreateTransformForm extends Component<CreateTransformFormProps, CreateTransformFormState> {
  static contextType = CoreServicesContext;

  constructor(props: CreateTransformFormProps) {
    super(props);

    this.state = {
      currentStep: 1,
      transformSeqNo: null,
      transformPrimaryTerm: null,
      transformId: "",
      transformIdError: "",
      submitError: "",
      isSubmitting: false,
      hasSubmitted: false,
      loadingIndices: true,
      indices: [],
      totalIndices: 0,

      mappings: "",
      allMappings: [],
      fields: [],
      selectedFields: [],
      selectedTerms: [],
      selectedGroupField: [],
      selectedAggregations: new Map(),
      aggregationsError: "",
      description: "",

      sourceIndex: [],
      sourceIndexError: "",
      targetIndex: [],
      targetIndexError: "",

      intervalError: "",

      jobEnabledByDefault: true,
      interval: 1,
      intervalTimeunit: "MINUTES",
      pageSize: 1000,
      transformJSON: JSON.parse(EMPTY_TRANSFORM),
    };
    this._next = this._next.bind(this);
    this._prev = this._prev.bind(this);
  }

  componentDidMount = async (): Promise<void> => {
    this.context.chrome.setBreadcrumbs([BREADCRUMBS.INDEX_MANAGEMENT, BREADCRUMBS.TRANSFORMS, BREADCRUMBS.CREATE_TRANSFORM]);
  };

  getMappings = async (srcIndex: string): Promise<void> => {
    if (!srcIndex.length) return;
    try {
      const { transformService } = this.props;
      const response = await transformService.getMappings(srcIndex);
      if (response.ok) {
        let allMappings: FieldItem[][] = [];
        const mappings = response.response;
        //Push mappings array to allMappings 2D array first
        for (let index in mappings) {
          allMappings.push(parseFieldOptions("", mappings[index].mappings.properties));
        }
        //Find intersect from all mappings
        const fields = allMappings.reduce((mappingA, mappingB) =>
          mappingA.filter((itemA) => mappingB.some((itemB) => compareFieldItem(itemA, itemB)))
        );
        this.setState({ mappings, fields, allMappings });
      } else {
        this.context.notifications.toasts.addDanger(`Could not load fields: ${response.error}`);
      }
    } catch (err) {
      this.context.notifications.toasts.addDanger(getErrorMessage(err, "Could not load fields"));
    }
  };

  _next() {
    let currentStep = this.state.currentStep;
    let error = false;
    //Verification here
    if (currentStep == 1) {
      const { transformId, sourceIndex, targetIndex } = this.state;

      if (!transformId) {
        this.setState({ submitError: "Job name is required.", transformIdError: "Job name is required." });
        error = true;
      }
      if (sourceIndex.length == 0) {
        this.setState({ submitError: "Source index is required.", sourceIndexError: "Source index is required." });
        error = true;
      }
      if (targetIndex.length == 0) {
        this.setState({ submitError: "Target index is required.", targetIndexError: "Target index is required." });
        error = true;
      }
    } else if (currentStep == 2) {
      const { selectedAggregations } = this.state;
      if (selectedAggregations.size != 0) {
        //Check if there's any aggregation item with no method selected.
        //TODO: Could Probably store all invalid fields in an array and highlight them in table.
        // TODO: Validate aggregations

      }
    } else if (currentStep == 3) {
      //Check if interval is a valid value and is specified.
      const { intervalError } = this.state;
    }

    if (error) return;

    currentStep = currentStep >= 3 ? 4 : currentStep + 1;

    this.setState({
      submitError: "",
      currentStep: currentStep,
    });
  }

  _prev() {
    let currentStep = this.state.currentStep;
    // If the current step is 2 or 3, then subtract one on "previous" button click
    currentStep = currentStep <= 1 ? 1 : currentStep - 1;
    this.setState({
      currentStep: currentStep,
    });
  }

  onChangeStep = (step: number): void => {
    if (step > 3) return;
    this.setState({
      currentStep: step,
    });
  };

  onChangeDescription = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    const description = e.target.value;
    let newJSON = this.state.transformJSON;
    newJSON.transform.description = description;
    this.setState({ description: description, transformJSON: newJSON });
  };

  onChangeName = (e: ChangeEvent<HTMLInputElement>): void => {
    const transformId = e.target.value;
    this.setState({ transformId, transformIdError: transformId ? "" : "Name is required" });
  };

  onChangeSourceIndex = async (options: EuiComboBoxOptionOption<IndexItem>[]): Promise<void> => {
    let newJSON = this.state.transformJSON;
    let sourceIndex = options.map(function (option) {
      return option.label;
    });
    const sourceIndexError = sourceIndex.length ? "" : "Source index is required";
    const srcIndexText = sourceIndex.length ? sourceIndex[0] : "";
    newJSON.transform.source_index = srcIndexText;
    this.setState({ sourceIndex: options, transformJSON: newJSON, sourceIndexError: sourceIndexError });
    this.setState({
      selectedGroupField: [],
      selectedAggregations: new Map(),
    });
    await this.getMappings(srcIndexText);
  };

  onChangeTargetIndex = (options: EuiComboBoxOptionOption<IndexItem>[]): void => {
    //Try to get label text from option from the only array element in options, if exists
    let newJSON = this.state.transformJSON;
    let targetIndex = options.map(function (option) {
      return option.label;
    });

    const targetIndexError = targetIndex.length ? "" : "Target index is required";

    newJSON.transform.target_index = targetIndex[0];
    this.setState({ targetIndex: options, transformJSON: newJSON, targetIndexError: targetIndexError });
  };

  onGroupSelectionChange = (selectedFields: DimensionItem[]): void => {
    this.setState({ selectedGroupField: selectedFields });
  };

  onAggregationSelectionChange = (selectedFields: Map<string, any>): void => {
    console.log("Agg change: " + selectedFields);
    this.setState({ selectedAggregations: selectedFields });
  };

  onChangeJobEnabledByDefault = (): void => {
    const checked = this.state.jobEnabledByDefault;
    let newJSON = this.state.transformJSON;
    newJSON.transform.enabled = !checked;
    this.setState({ jobEnabledByDefault: !checked, transformJSON: newJSON });
  };

  onChangeIntervalTime = (e: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ interval: e.target.valueAsNumber });
    if (e.target.value == "") {
      const intervalErrorMsg = "Interval value is required.";
      this.setState({ submitError: intervalErrorMsg, intervalError: intervalErrorMsg });
    } else {
      this.setState({ intervalError: "" });
    }
  };

  onChangePage = (e: ChangeEvent<HTMLInputElement>): void => {
    let newJSON = this.state.transformJSON;
    newJSON.transform.page_size = e.target.valueAsNumber;
    this.setState({ pageSize: e.target.valueAsNumber, transformJSON: newJSON });
  };

  updateSchedule = (): void => {
    const { interval, intervalTimeunit } = this.state;
    let newJSON = this.state.transformJSON;

    newJSON.transform.schedule.interval = {
      start_time: moment().unix(),
      unit: `${intervalTimeunit}`,
      period: `${interval}`,
    };
    delete newJSON.transform.schedule["cron"];

    this.setState({ transformJSON: newJSON });
  };

  onChangeIntervalTimeunit = (e: ChangeEvent<HTMLSelectElement>): void => {
    this.setState({ intervalTimeunit: e.target.value });
  };

  updateGroup = (): void => {
    const { transformJSON, selectedGroupField } = this.state;
    let newJSON = transformJSON;

    // Clear the groups fields
    newJSON.transform.groups = [];

    // Push rest of groups
    selectedGroupField.map((group) => {
      if (group.aggregationMethod == "terms") {
        newJSON.transform.groups.push({
          terms: {
            source_field: group.field.label,
            target_field: "", // needs target_field source, null target_field test
          },
        });
      } else if (group.aggregationMethod == "histogram") {
        newJSON.transform.groups.push({
          histogram: {
            source_field: group.field.label,
            interval: group.interval,
          },
        });
      } else {
        newJSON.transform.groups.push({
          date_histogram: {
            source_field: group.field.label,
            // need to fill out other date histogram data
          },
        });
      }
    });

    // Testing Group Structure, uncomment to use group hardcoded for kibana_sample_data_ecommerce
    /**
    newJSON.transform.groups.push({
      histogram : {
        source_field: "total_unique_products",
        interval: "1"
      }
    })
    */

    this.setState({ transformJSON: newJSON });
  };

  updateAggregation = (): void => {
    const { transformJSON, selectedAggregations } = this.state;
    let newJSON = transformJSON;

    newJSON.transform.aggregations = {};

    //Push all aggregations
    selectedAggregations.forEach((aggregation, target_field) => {
      // This assumes the aggregation comes formatted already, may need to do more work here
      newJSON.transform.aggregations[target_field] = Object.fromEntries(aggregation);
    });

    // Testing aggregation formatting, uncomment to use aggregation hardcoded for kibana_sample_data_ecommerce
    /**
    newJSON.transform.aggregations["taxful_total_price"] = {
      sum : {
        field : "total_price"
      }
    }
    */

    this.setState({ transformJSON: newJSON });
  };

  onSubmit = async (): Promise<void> => {
    const { transformId, transformJSON } = this.state;
    this.setState({ submitError: "", isSubmitting: true, hasSubmitted: true });
    try {
      if (!transformId) {
        this.setState({ transformIdError: "Required" });
      } else {
        this.updateGroup();
        this.updateAggregation();
        this.updateSchedule();
        console.log(transformJSON);
        await this.onCreate(transformId, transformJSON);
      }
    } catch (err) {
      this.context.notifications.toasts.addDanger("Invalid Transform JSON");
      console.error(err);
    }

    this.setState({ isSubmitting: false });
  };

  onCancel = (): void => {
    this.props.history.push(ROUTES.TRANSFORMS);
  };

  onCreate = async (transformId: string, transform: Transform): Promise<void> => {
    const { transformService } = this.props;
    try {
      const response = await transformService.putTransform(transform, transformId);
      if (response.ok) {
        this.context.notifications.toasts.addSuccess(`Created transform: ${response.response._id}`);
        this.props.history.push(ROUTES.TRANSFORMS);
      } else {
        this.setState({ submitError: response.error });
        this.context.notifications.toasts.addDanger(`Failed to create transform: ${response.error}`);
      }
    } catch (err) {
      this.setState({ submitError: getErrorMessage(err, "There was a problem creating the transform job") });
      this.context.notifications.toasts.addDanger(
        `Failed to create transform: ${getErrorMessage(err, "There was a problem creating the transform job")}`
      );
    }
  };

  render() {
    const {
      transformId,
      transformIdError,
      submitError,
      isSubmitting,
      hasSubmitted,
      description,
      sourceIndex,
      sourceIndexError,
      targetIndex,
      targetIndexError,
      currentStep,

      fields,
      selectedTerms,
      selectedGroupField,
      selectedAggregations,
      aggregationsError,

      jobEnabledByDefault,
      interval,
      intervalTimeunit,
      intervalError,
      pageSize,
    } = this.state;
    return (
      <form onSubmit={this.onSubmit}>
        <CreateTransform
          {...this.props}
          transformId={transformId}
          transformIdError={transformIdError}
          submitError={submitError}
          isSubmitting={isSubmitting}
          hasSubmitted={hasSubmitted}
          description={description}
          sourceIndex={sourceIndex}
          sourceIndexError={sourceIndexError}
          targetIndex={targetIndex}
          targetIndexError={targetIndexError}
          onChangeName={this.onChangeName}
          onChangeDescription={this.onChangeDescription}
          onChangeSourceIndex={this.onChangeSourceIndex}
          onChangeTargetIndex={this.onChangeTargetIndex}
          currentStep={this.state.currentStep}
          hasAggregation={selectedGroupField.length != 0 || selectedAggregations.size != 0}
        />
        <CreateTransformStep2
          {...this.props}
          currentStep={this.state.currentStep}
          sourceIndex={sourceIndex[0] ? sourceIndex[0].label : ""}
          fields={fields}
          selectedTerms={selectedTerms}
          selectedGroupField={selectedGroupField}
          selectedAggregations={selectedAggregations}
          aggregationsError={aggregationsError}
          onGroupSelectionChange={this.onGroupSelectionChange}
          onAggregationSelectionChange={this.onAggregationSelectionChange}
        />
        <CreateTransformStep3
          {...this.props}
          currentStep={this.state.currentStep}
          jobEnabledByDefault={jobEnabledByDefault}
          interval={interval}
          intervalTimeunit={intervalTimeunit}
          intervalError={intervalError}
          pageSize={pageSize}
          onChangeJobEnabledByDefault={this.onChangeJobEnabledByDefault}
          onChangeIntervalTime={this.onChangeIntervalTime}
          onChangePage={this.onChangePage}
          onChangeIntervalTimeunit={this.onChangeIntervalTimeunit}
        />
        <CreateTransformStep4
          {...this.props}
          transformId={transformId}
          description={description}
          sourceIndex={sourceIndex}
          targetIndex={targetIndex}
          selectedGroupField={selectedGroupField}
          selectedAggregations={selectedAggregations}
          jobEnabledByDefault={jobEnabledByDefault}
          interval={interval}
          intervalTimeunit={intervalTimeunit}
          pageSize={pageSize}
          currentStep={this.state.currentStep}
          onChangeStep={this.onChangeStep}
          submitError={submitError}
        />
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd" style={{ padding: "5px 50px" }}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={this.onCancel} data-test-subj="createTransformCancelButton">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          {currentStep != 1 && (
            <EuiFlexItem grow={false}>
              <EuiButton onClick={this._prev} data-test-subj="createTransformPreviousButton">
                Previous
              </EuiButton>
            </EuiFlexItem>
          )}

          {currentStep == 4 ? (
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={this.onSubmit} isLoading={isSubmitting} data-test-subj="createTransformSubmitButton">
                Create
              </EuiButton>
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={this._next} data-test-subj="createTransformNextButton">
                Next
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </form>
    );
  }
}
