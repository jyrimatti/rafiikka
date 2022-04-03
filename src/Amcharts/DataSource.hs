{-# LANGUAGE ScopedTypeVariables #-}
module Amcharts.DataSource where

import Universum hiding (Element, on)
import Language.Javascript.JSaddle (JSM, JSString, (!), (<#), FromJSVal (fromJSVal), isUndefined, ghcjsPure, JSVal)
import JSDOM.Types as JSDOM (Element)
import JSDOM (currentWindow)
import JSDOM.Generated.Element (removeAttribute)
import Amcharts.Events ( on, on1 )
import Data.Text (replace)
import Yleiset (errorHandler, DataType)

monitor :: JSVal -> DataType -> JSM ()
monitor ds datatype = do
  events <- ds ! ("events" :: JSString)
  on1 events "error" errorHandler
  
  on events "started" $ progressStart datatype
  on events "ended" $ progressEnd datatype

  pure ()

progressStart :: DataType -> JSM ()
progressStart datatype = do
  Just window <- currentWindow
  Just (progress :: JSDOM.Element) <- fromJSVal =<< window ! ("progress" :: JSString)
  progress <# ("title" :: JSString) $ (" " <> show datatype :: Text)
  Just maxVal <- fromJSVal =<< progress ! ("max" :: JSString)
  progress <# ("max" :: JSString) $ maxVal + (1 :: Int)
  hasValue <- progress ! ("value" :: JSString)
  hasNotValue <- ghcjsPure $ isUndefined hasValue
  if hasNotValue
    then progress <# ("value" :: JSString) $ (1 :: Int)
    else pure ()

progressEnd :: DataType -> JSM ()
progressEnd datatype = do
  Just window <- currentWindow
  Just (progress :: JSDOM.Element) <- fromJSVal =<< window ! ("progress" :: JSString)
  title <- fromJSVal =<< progress ! ("title" :: JSString)
  case title of
    Just t -> progress <# ("title" :: JSString) $ replace (" " <> show datatype) "" t
    _ -> pure ()

  Just val <- fromJSVal =<< progress ! ("value" :: JSString)
  progress <# ("value" :: JSString) $ val + (1 :: Int)

  Just maxVal <- fromJSVal =<< progress ! ("max" :: JSString)
  when (val == maxVal) $ do
    progress `removeAttribute` ("value" :: JSString)
    progress <# ("max" :: JSString) $ (1 :: Int)
