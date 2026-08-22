@e2e
Feature: Foundation chain
  As a crocheter
  I want to start my pattern with a foundation chain
  So that I have a base to work subsequent rows into

  Background:
    Given I am using the crochet pattern designer

  Scenario: Create a foundation chain
    Given I have no pattern
    When I choose "New Chain" and enter 3 in the chain length dialog
    Then the pattern status should be "Foundation"
    And the stitch count should be 3
    And the foundation length should be 3
    And the instructions should include "Foundation: ch 3"

  @e2e
  Scenario: Chain length dialog opens with a default of 10
    Given I have no pattern
    When I open the new chain dialog
    Then the chain length should be 10
    And the chain length field should be focused and selected

  @e2e
  Scenario: Chain length can be typed directly
    Given I have no pattern
    When I open the new chain dialog
    And I try to enter "abc" in the chain length field
    Then the chain length field should contain only numbers

  @e2e
  Scenario: Chain length can be adjusted with stepper buttons
    Given I have no pattern
    When I open the new chain dialog
    And I decrease the chain length once
    Then the chain length should be 9
    When I increase the chain length twice
    Then the chain length should be 11

  @e2e
  Scenario: Stepper buttons disable at min and max bounds
    Given I have no pattern
    When I open the new chain dialog
    And I set the chain length to 1
    Then the decrease chain length control should be disabled
    When I set the chain length to 500
    Then the increase chain length control should be disabled

  @e2e
  Scenario: Out-of-range chain length shows an error in the dialog
    Given I have no pattern
    When I open the new chain dialog
    And I enter 501 in the chain length field
    And I choose "Create chain"
    Then I should see an error "Chain length must be between 1 and 500."

  @engine
  Scenario: Chain length must be within allowed bounds
    Given I have no pattern
    When I try to create a foundation chain of 0
    Then the operation should be rejected
    When I try to create a foundation chain of 501
    Then the operation should be rejected

  @engine
  Scenario: Cannot create a second foundation chain without reset
    Given I have a foundation chain of 3
    When I try to create another foundation chain of 5
    Then the operation should be rejected
