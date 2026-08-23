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
    And I should see next-step guidance to choose "New Row"
    And the row progress should be "—"

  Scenario: Chain length dialog opens with a default of 10
    Given I have no pattern
    When I open the new chain dialog
    Then the chain length should be 10
    And the chain length field should be focused and selected

  Scenario: Chain length can be typed directly
    Given I have no pattern
    When I open the new chain dialog
    And I try to enter "abc" in the chain length field
    Then the chain length field should contain only numbers

  Scenario: Chain length can be adjusted with stepper buttons
    Given I have no pattern
    When I open the new chain dialog
    And I decrease the chain length once
    Then the chain length should be 9
    When I increase the chain length twice
    Then the chain length should be 11

  Scenario: Chain length can be adjusted with arrow keys
    Given I have no pattern
    When I open the new chain dialog
    And I press Arrow Down in the chain length field
    Then the chain length should be 9
    When I press Arrow Up twice in the chain length field
    Then the chain length should be 11

  Scenario: Enter submits a valid chain length
    Given I have no pattern
    When I open the new chain dialog
    And I enter 4 in the chain length field
    And I press Enter in the chain length field
    Then the foundation length should be 4

  Scenario: Stepper buttons disable at min and max bounds
    Given I have no pattern
    When I open the new chain dialog
    And I set the chain length to 1
    Then the decrease chain length control should be disabled
    When I set the chain length to 500
    Then the increase chain length control should be disabled

  Scenario: Empty chain length shows an error in the dialog
    Given I have no pattern
    When I open the new chain dialog
    And I clear the chain length field
    And I choose "Create foundation chain"
    Then I should see an error "Enter a chain length."

  Scenario: Out-of-range chain length shows an error in the dialog
    Given I have no pattern
    When I open the new chain dialog
    And I enter 501 in the chain length field
    And I choose "Create foundation chain"
    Then I should see an error "Chain length must be between 1 and 500."

  Scenario: Cancel closes the chain dialog without creating a chain
    Given I have no pattern
    When I open the new chain dialog
    And I choose "Cancel"
    Then the stitch count should be 0

  Scenario: Escape closes the chain dialog without creating a chain
    Given I have no pattern
    When I open the new chain dialog
    And I press Escape
    Then the stitch count should be 0

  Scenario: Declining New Chain reset keeps the existing pattern
    Given I have a foundation chain of 3
    When I choose "New Chain"
    And I choose "Cancel" in the confirmation dialog
    Then the stitch count should be 3

  Scenario: Confirming New Chain reset replaces the pattern
    Given I have a foundation chain of 3
    When I choose "New Chain"
    And I confirm starting a new foundation chain
    And I enter 5 in the chain length field
    And I choose "Create foundation chain"
    Then the stitch count should be 5
    And the foundation length should be 5

  Scenario: Create a magic ring foundation
    Given I have no pattern
    When I choose "New Chain"
    And I choose the "Magic ring" foundation type
    And I enter 6 in the stitch count field
    And I choose "Create magic ring"
    Then the pattern status should be "Magic ring"
    And the stitch count should be 6
    And the instructions should include "Foundation: magic ring, 6 sc"
    And I should see next-step guidance to work into the magic ring stitches

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
