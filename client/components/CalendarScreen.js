import React, { Component } from 'react';
import { Button, View, Text, StyleSheet } from 'react-native';
import {Agenda} from 'react-native-calendars';
import axios from 'axios';
import store from 'react-native-simple-store';

export default class AddScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: {}
    };
    this.loadItems = this.loadItems.bind(this);
    this.loadGoogleItems = this.loadGoogleItems.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.renderEmptyDate = this.renderEmptyDate.bind(this);
    this.findMaxDay = this.findMaxDay.bind(this);
    this.calculateHeight = this.calculateHeight.bind(this);
    this.makeAlarm = this.makeAlarm.bind(this);
  }

  static navigationOptions = {
    title: 'CalendarScreen',
  };

  componentDidMount() {

  }

  render() {
    return (
      <Agenda
        // the list of items that have to be displayed in agenda. If you want to render item as empty date
        // the value of date key kas to be an empty array []. If there exists no value for date key it is
        // considered that the date in question is not yet loaded
        items={this.state.items}
        // callback that gets called when items for a certain month should be loaded (month became visible)
        loadItemsForMonth={this.loadItems}
        // initially selected day
        selected={new Date().toISOString().slice(0,10)}
        // specify how each item should be rendered in agenda
        renderItem={this.renderItem}
        // specify how empty date content with no items should be rendered
        renderEmptyDate={this.renderEmptyDate}
        // specify your item comparison function for increased performance
        rowHasChanged={this.rowHasChanged.bind(this)}

         // callback that fires when the calendar is opened or closed
         onCalendarToggled={(calendarOpened) => {console.log("calendar opened data:", calendarOpened)}}
         // callback that gets called on day press
         onDayPress={(day)=>{console.log('day pressed')}}
         // callback that gets called when day changes while scrolling agenda list
         onDayChange={(day)=>{console.log('day changed')}}
         // Minimum date that can be selected, dates before minDate will be grayed out. Default = undefined
         minDate={new Date(new Date().setFullYear(new Date().getUTCFullYear() - 1)).toISOString().slice(0,10)}
         // Maximum date that can be selected, dates after maxDate will be grayed out. Default = undefined
         maxDate={new Date(new Date().setFullYear(new Date().getUTCFullYear() + 1)).toISOString().slice(0,10)}
         // Max amount of months allowed to scroll to the past. Default = 50
         pastScrollRange={12}
         // Max amount of months allowed to scroll to the future. Default = 50
         futureScrollRange={18}
         // specify how each date should be rendered. day can be undefined if the item is not first in that day.
         // renderDay={(day, item) => {
         //   if (!day) day = {dateString: 'fuck off'}
         //   return <View><Text>{day.dateString}</Text></View>}}
         // // specify how agenda knob should look like
         // renderKnob={() => <View><Text>this was rendered by...renderKnob!</Text></View>}
         // // specify what should be rendered instead of ActivityIndicator
         // renderEmptyData = {() => <View><Text>this was rendered by...renderEmptyData!</Text></View>}
         // // specify your item comparison function for increased performance
         rowHasChanged={(r1, r2) => {return r1.text !== r2.text}}
         // Hide knob button. Default = false
         hideKnob={false}
         // By default, agenda dates are marked if they have at least one item, but you can override this if needed
         // markedDates={{
         //   '2018-06-16': {selected: true, marked: true},
         //   '2018-06-17': {marked: true},
         //   '2018-06-18': {disabled: true},
         // }}
      />
    );
  }
  loadItems(date) {
    const { timestamp } = date;
    const defItems = {};
    let firstKey = '';
    let lastKey = '';

    for (let i = -15; i < 85; i++) {
      const defaultTime = timestamp + i * 24 * 60 * 60 * 1000;
      const defaultStrTime = this.timeToString(defaultTime);
      if (!this.state.items[defaultStrTime]) {
        this.state.items[defaultStrTime] = [];
      }
    }
    Object.keys(this.state.items).forEach((key, i, arr) => {
      if (i === 0) {
        firstKey = key;
      } else if (i === arr.length - 1) {
        lastKey = key;
      }
      defItems[key] = this.state.items[key];
    });
    this.setState({
      items: defItems
    },() => {
      this.loadGoogleItems(date, firstKey, lastKey);
    });
  }

  loadGoogleItems(date, startDate, endDate) {
    const { dateString, day, month, year } = date;
    const minTime = `${startDate}T00:00:00-01:00:00`
    // const minTime = `${year}-${month}-01T00:00:00-01:00:00`
    const maxTime = `${endDate}T11:59:58-11:59:59`
    // const maxTime = `${year}-${month}-${this.findMaxDay(month)}T11:59:58-11:59:59`
    axios.get("http://localhost:8082/auth/calendar", {
      params: {
        userId: this.props.navigation.state.params.userId,
        minTime,
        maxTime,
      }
    })
    .catch((err) => {
      console.log('Error retrieving calendar data. Returning to settings screen. Err:', err)
    })
    .then(({ data }) => {
      console.log('ORIGINAL DATA', data)
      const newItems = {};
      Object.keys(this.state.items).forEach(key => {newItems[key] = this.state.items[key];});

      data.forEach((event, i) => {
        let { id, name, time, endTime, location } = event
        if (!time.date) {
          let dateStr = time.dateTime.slice(0,10)
          let startTimeStr = time.dateTime.slice(11,19)
          let endTimeStr = endTime.dateTime.slice(11,19)

          // let height = 50 +
          let eventData = {
            name,
            location,
            time: startTimeStr,
            endTime: endTimeStr,
            height: this.calculateHeight(startTimeStr, endTimeStr),
          }
          // newItems[dateStr] ? newItems[dateStr].push(eventData) : newItems[dateStr] = [eventData];
          if (newItems[dateStr].length) {
            newItems[dateStr].forEach((ev) => {
              if (!(ev.time && ev.name === eventData.name && ev.time === eventData.time)) {
                newItems[dateStr].push(eventData);
              }
            })
          } else {
            newItems[dateStr] = [eventData];
          }
        }
      });
      Object.keys(newItems).forEach((date) => {
        if (newItems[date] && newItems[date].length) {
          let uniqArr = [];
          newItems[date].forEach((evt) => {
            if (!(uniqArr.find(el => el.name === evt.name && el.time === evt.time))) {
              // console.log('push event!:', evt);
              uniqArr.push(evt)
            } else {
              console.log('this event already exists!', evt);
            }
          })
          newItems[date] = uniqArr;
        }
      })
      this.setState({
        items: newItems,
      }, () => console.log("this.state.items after newItems are set:", this.state.items));
    }).catch(() => console.log('Error in loadGoogleItems'))
  }

  makeAlarm() {
    store.get('places').then((places) => {
      let favPlaces = Object.entries(places).sort((a, b) => a[1].count < b[1].count);
      favPlaces = favPlaces.map(p => ({ description: p[1].address, place_id: p[0] })).slice(0,2);
      // this.props.navigation.navigate('AddScreen', {
      //   userId: this.props.navigation.state.params.userId,
      //   settings: this.state.userSettings,
      //   favPlaces: this.state.favPlaces,
      // });
    });
  }

  calculateHeight(startTimeStr, endTimeStr) {
    let startInSeconds = startTimeStr.split(':').reduce((acc, el, i) => acc + (parseInt(el) * 60 ** (2 - i)), 0);
    let endInSeconds = endTimeStr.split(':').reduce((acc, el, i) => acc + (parseInt(el) * 60 ** (2 - i)), 0);
    return ((endInSeconds - startInSeconds) / 250 + 50);
  }

  findMaxDay(month) {
    if (month === 2) {
      return 28;
    } else if (month === 1 || month === 3 ||month === 5 || month === 8 || month === 10 || month === 12) {
      return 31;
    } else {
      return 30;
    }
  }

  renderItem(item) {
    let { height, name, time, endTime } = item;
    const convertHours = function convertHoursToHumanReadableTimeForDisplay(time) {
      let hours = parseInt(time.slice(0,2))
      let restOfTimeStr = time.slice(2,5)
      let resultTime = '';

      if (hours === 0) {
        resultTime = `12${restOfTimeStr}AM`;
      } else if (hours < 12) {
        resultTime = `${hours}${restOfTimeStr}AM`;
      } else if (hours === 12) {
        resultTime = `12${restOfTimeStr}PM`;
      } else if (hours > 12) {
        resultTime = `${hours-12}${restOfTimeStr}PM`;
      } else {
        resultTime = time
      }
      return resultTime;
    }

    return (
      <View style={[styles.item, {height: item.height*1.5}]}>
        <Text>{item.name}</Text>
        <Text>{convertHours(time)}-{convertHours(endTime)}</Text>
        <Button title="add to alarms" onPress={() => console.log('You pressed me! =D')}></Button>
      </View>
    );
  }

  renderEmptyDate() {
    // console.log('THIS IS THE renderEmptyDate FUNCTION.')
    return (
      <View style={styles.emptyDate}></View>
    );
  }

  rowHasChanged(r1, r2) {
    // NOTE: THIS FUNCTION updates the modules' shouldComponentUpdate function, so it needs to return either TRUE or FALSE
    return r1.name !== r2.name;
  }

  timeToString(time) {
    const date = new Date(time);
    return date.toISOString().split('T')[0];
  }
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: 'pink',
    flex: 1,
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    marginTop: 17
  },
  emptyDate: {
    height: 15,
    flex:1,
    paddingTop: 30
  }
});
