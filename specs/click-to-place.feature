@e2e
Feature: Click-to-place single crochet
  As a crocheter
  I want to click attachment points in the 3D canvas
  So that I can place stitches where they belong

  Background:
    Given I am using the crochet pattern designer

  Scenario: Next attachment point is available when SC can be placed
    Given I have a foundation chain of 3
    And I am on row 1
    Then I should see an attachment point control in the canvas

  Scenario: Clicking the attachment point places the next SC
    Given I have a foundation chain of 3
    And I am on row 1
    When I click the attachment point in the canvas
    Then the stitch count should be 4
    And the row progress should be "1/3"

  Scenario: No attachment point when SC cannot be placed
    Given I have no pattern
    Then I should not see an attachment point control in the canvas

  Scenario: Click-to-place matches Add SC toolbar behavior
    Given I have a foundation chain of 3
    And I am on row 1
    When I click the attachment point in the canvas three times
    Then the row progress should be "3/3"

  @engine
  Scenario: Reject placement on an invalid attachment target
    Given I am on row 1 with one SC placed on a foundation chain of 3
    When I try to place SC on a non-next attachment target
    Then the operation should be rejected
