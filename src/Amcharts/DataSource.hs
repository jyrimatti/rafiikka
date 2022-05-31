{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TypeApplications #-}
module Amcharts.DataSource where

import Universum hiding (Element, on, head)
import Language.Javascript.JSaddle (JSM, JSString, (!), (<#), FromJSVal (fromJSVal), isUndefined, ghcjsPure, JSVal)
import JSDOM.Types as JSDOM (Element)
import JSDOM (currentWindow)
import JSDOM.Generated.Element (removeAttribute)
import Amcharts.Events ( on, on1 )
import Data.Text (replace, unpack)
import Yleiset (errorHandler)
import Jeti.Types (JetiType)
import Ruma.Types (RumaType)
import Infra.Types (InfraType)
import Trex.Types (TrexType)
import Monadic (doFromJSVal)
import Types (FintrafficSystem)
import qualified Data.List.NonEmpty as NonEmpty
import Data.List (head)
import Data.Time (Day)

data DataType = InfraData InfraType
              | JetiData JetiType
              | RumaData RumaType
              | TrexData TrexType
              | Search FintrafficSystem Int
              | Timetable Day
              | Statistics Text
              | Revisions
              | Other Text
  deriving Show



instance FromJSVal DataType where
  fromJSVal = doFromJSVal "DataType" $ \x -> do
    a :: NonEmpty Text <- MaybeT $ fromJSVal x
    let b = head $ NonEmpty.drop 1 a
    let c = head $ NonEmpty.drop 2 a
    case NonEmpty.head a of
      "Infra"      -> InfraData <$> hoistMaybe (readMaybe $ unpack b)
      "Jeti"       -> JetiData <$> hoistMaybe (readMaybe $ unpack b)
      "Ruma"       -> RumaData <$> hoistMaybe (readMaybe $ unpack b)
      "Trex"       -> TrexData <$> hoistMaybe (readMaybe $ unpack b)
      "Search"     -> Search <$> hoistMaybe (readMaybe $ unpack b) <*> hoistMaybe (readMaybe $ unpack c)
      "Timetable"  -> Timetable <$> hoistMaybe (readMaybe $ unpack b)
      "Statistics" -> pure $ Statistics b
      "Revisions"  -> pure Revisions
      aa           -> pure $ Other aa

monitor :: JSVal -> DataType -> JSM ()
monitor ds dataType = do
  events <- ds ! ("events" :: JSString)
  on1 events "error" errorHandler
  
  on events "started" $ progressStart dataType
  on events "ended" $ progressEnd dataType

  pure ()

progressStart :: DataType -> JSM ()
progressStart dataType = do
  Just window <- currentWindow
  Just (progress :: JSDOM.Element) <- fromJSVal =<< window ! ("progress" :: JSString)
  progress <# ("title" :: JSString) $ (" " <> show dataType :: Text)
  Just maxVal <- fromJSVal =<< progress ! ("max" :: JSString)
  progress <# ("max" :: JSString) $ maxVal + (1 :: Int)
  hasValue <- progress ! ("value" :: JSString)
  hasNotValue <- ghcjsPure $ isUndefined hasValue
  if hasNotValue
    then progress <# ("value" :: JSString) $ (1 :: Int)
    else pure ()

progressEnd :: DataType -> JSM ()
progressEnd dataType = do
  Just window <- currentWindow
  Just (progress :: JSDOM.Element) <- fromJSVal =<< window ! ("progress" :: JSString)
  title <- fromJSVal =<< progress ! ("title" :: JSString)
  case title of
    Just t -> progress <# ("title" :: JSString) $ replace (" " <> show dataType) "" t
    _ -> pure ()

  Just val <- fromJSVal =<< progress ! ("value" :: JSString)
  progress <# ("value" :: JSString) $ val + (1 :: Int)

  Just maxVal <- fromJSVal =<< progress ! ("max" :: JSString)
  when (val == maxVal) $ do
    progress `removeAttribute` ("value" :: JSString)
    progress <# ("max" :: JSString) $ (1 :: Int)
